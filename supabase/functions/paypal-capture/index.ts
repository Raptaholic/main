// ─────────────────────────────────────────────────────────────────────────
// paypal-capture — capture a PayPal order after the buyer approves it, mark our
// order paid, then notify the store.
//
// Only marks the order paid (and only notifies the store) if PayPal reports
// status COMPLETED AND the capture's custom_id matches our order id — so a
// caller cannot mark an arbitrary order paid without a genuine PayPal payment
// that we created for exactly that order.
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

// Store inboxes that get a notification once an online order is actually PAID.
const STORE_EMAILS = ["novupeptides@gmail.com", "abdullahhawkkhair@gmail.com", "mohamed.hanach07@gmail.com"];
const money = (n: unknown) =>
  "AED " + Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clean = (s: unknown) => String(s ?? "").replace(/[\r\n\t]+/g, " ").slice(0, 400);

// deno-lint-ignore no-explicit-any
async function notifyStore(o: any) {
  try {
    const c = o.customer ?? {};
    const items = (o.items ?? [])
      .map((it: { name?: string; qty?: number; price?: number }) =>
        "  " + clean(it.name) + " x " + it.qty + " = " + money(Number(it.price) * Number(it.qty)))
      .join("\n");
    const body = [
      "PAID ORDER " + clean(o.id),
      "Paid via: " + clean(o.payment_provider ?? "online"),
      "",
      "ITEMS",
      items,
      "",
      "Subtotal: " + money(o.subtotal),
      Number(o.discount) > 0
        ? "Discount: -" + money(o.discount) + (o.discount_label ? " (" + clean(o.discount_label) + ")" : "")
        : null,
      "Shipping: " + money(o.delivery),
      "VAT (5%): " + money(o.vat),
      Number(o.fee) > 0 ? "Card fee: " + money(o.fee) : null,
      "TOTAL: " + money(o.total),
      "",
      "CUSTOMER",
      "Name: " + clean(c.name),
      "Phone: " + clean(c.phone),
      "Email: " + clean(c.email ?? "-"),
      "Address: " + clean(c.address),
      "Emirate: " + clean(c.emirate),
      (c.deliveryDate || c.deliveryTime)
        ? "Preferred: " + clean([c.deliveryDate, c.deliveryTime].filter(Boolean).join(" "))
        : null,
      "Account: " + clean(c.accountEmail ?? "guest"),
      c.notes ? "Notes: " + clean(c.notes) : null,
    ].filter((v) => v !== null).join("\n");
    const payload = JSON.stringify({
      _subject: "PAID Order " + clean(o.id) + " - " + money(o.total),
      name: clean(c.name),
      email: (typeof c.email === "string" && c.email) ? c.email : "noreply@novupeptides.store",
      message: body,
    });
    await Promise.allSettled(STORE_EMAILS.map((em) =>
      fetch("https://formsubmit.co/ajax/" + em, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: payload,
      })
    ));
  } catch (_) {
    // email is best-effort; it must never block payment confirmation.
  }
}

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

    const { data: flipped } = await admin.from("orders")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        payment_provider: "paypal",
        payment_ref: capture?.id ?? paypalOrderId,
      })
      .eq("id", orderId)
      .eq("payment_status", "unpaid")
      .select("id,customer,items,subtotal,discount,discount_label,delivery,vat,fee,total,payment_provider");
    if (flipped && flipped.length) await notifyStore(flipped[0]);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
