// ─────────────────────────────────────────────────────────────────────────
// paypal-capture — capture a PayPal order after the buyer approves it, then
// mark our order paid.
//
// Called by our own page when the buyer returns from PayPal. It captures the
// PayPal order server-side and only marks the order paid if PayPal reports
// status COMPLETED AND the capture's custom_id matches our order id — so a
// caller cannot mark an arbitrary order paid without a genuine PayPal payment
// that we created for exactly that order (the amount was fixed at create time).
//
// Deploy:  supabase functions deploy paypal-capture
// Secrets: SITE_URL, PAYPAL_ENV, PAYPAL_CLIENT_ID, PAYPAL_SECRET
// ─────────────────────────────────────────────────────────────────────────
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
const PAYPAL_ENV = Deno.env.get("PAYPAL_ENV") ?? "sandbox";
const PAYPAL_BASE = PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET") ?? "";
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": SITE_URL || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

async function paypalToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: "Basic " + btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error("paypal auth failed");
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  try {
    const { paypalOrderId, orderId } = await req.json().catch(() => ({}));
    if (typeof paypalOrderId !== "string" || !/^[A-Z0-9]{5,64}$/.test(paypalOrderId)) {
      return json({ error: "invalid paypal order id" }, 400);
    }
    if (typeof orderId !== "string" || !/^NP-[A-Z0-9]{4,40}$/.test(orderId)) {
      return json({ error: "invalid order id" }, 400);
    }

    const token = await paypalToken();
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    const unit = data?.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    const completed = data?.status === "COMPLETED" && capture?.status === "COMPLETED";
    const customId = capture?.custom_id ?? unit?.custom_id;
    if (!completed) return json({ error: "capture not completed" }, 502);
    if (customId !== orderId) return json({ error: "order mismatch" }, 400);

    await admin.from("orders")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        payment_provider: "paypal",
        payment_ref: capture?.id ?? paypalOrderId,
      })
      .eq("id", orderId)
      .eq("payment_status", "unpaid");
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
