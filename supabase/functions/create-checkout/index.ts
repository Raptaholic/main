// ─────────────────────────────────────────────────────────────────────────
// create-checkout — start an online payment for an EXISTING order.
//
// SECURITY: the amount charged is read from the database (orders.total), never
// from the request body. A tampered browser can change what it *sends* but not
// what it *pays* — the order total was already fixed server-side by place_order
// (which itself re-derives prices from the products catalogue).
//
// Stripe is billed in AED. PayPal does not support AED, so PayPal is billed in
// USD using a configurable AED→USD rate (AED_USD_RATE).
//
// Deploy:  supabase functions deploy create-checkout
// Secrets: SITE_URL, STRIPE_SECRET_KEY, PAYPAL_ENV, PAYPAL_CLIENT_ID,
//          PAYPAL_SECRET, AED_USD_RATE   (SUPABASE_URL / SERVICE_ROLE are auto)
// ─────────────────────────────────────────────────────────────────────────
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
const PAYPAL_ENV = Deno.env.get("PAYPAL_ENV") ?? "sandbox";
const PAYPAL_BASE = PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET") ?? "";
const AED_USD_RATE = Number(Deno.env.get("AED_USD_RATE") ?? "0.2723");

// CORS is locked to the configured site origin when known.
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
    const { orderId, provider } = await req.json().catch(() => ({}));
    if (typeof orderId !== "string" || !/^NP-[A-Z0-9]{4,40}$/.test(orderId)) {
      return json({ error: "invalid order id" }, 400);
    }
    if (provider !== "stripe" && provider !== "paypal") {
      return json({ error: "invalid provider" }, 400);
    }
    if (!SITE_URL) return json({ error: "SITE_URL not configured" }, 500);

    // Read the AUTHORITATIVE amount from the database (service role bypasses RLS).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: order, error } = await admin
      .from("orders")
      .select("id,total,payment_status")
      .eq("id", orderId)
      .single();
    if (error || !order) return json({ error: "order not found" }, 404);
    if (order.payment_status === "paid") return json({ error: "order already paid" }, 409);

    const aed = Number(order.total);
    if (!Number.isFinite(aed) || aed <= 0) return json({ error: "invalid amount" }, 400);

    const base = `${SITE_URL}/?order=${encodeURIComponent(orderId)}`;

    if (provider === "stripe") {
      if (!STRIPE_SECRET) return json({ error: "stripe not configured" }, 500);
      const stripe = new Stripe(STRIPE_SECRET, {
        apiVersion: "2024-06-20",
        httpClient: Stripe.createFetchHttpClient(),
      });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "aed",
            product_data: { name: `Novu Peptides - Order ${orderId}` },
            unit_amount: Math.round(aed * 100),
          },
          quantity: 1,
        }],
        client_reference_id: orderId,
        metadata: { orderId },
        success_url: `${base}&paid=stripe`,
        cancel_url: `${base}&paid=cancel`,
      });
      return json({ url: session.url });
    }

    // PayPal — billed in USD (PayPal has no AED support).
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) return json({ error: "paypal not configured" }, 500);
    if (!Number.isFinite(AED_USD_RATE) || AED_USD_RATE <= 0) {
      return json({ error: "AED_USD_RATE not configured" }, 500);
    }
    const usd = (aed * AED_USD_RATE).toFixed(2);
    if (Number(usd) <= 0) return json({ error: "invalid amount" }, 400);
    const token = await paypalToken();
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          custom_id: orderId,
          description: `Novu Peptides Order ${orderId}`,
          amount: { currency_code: "USD", value: usd },
        }],
        application_context: {
          brand_name: "Novu Peptides",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: `${base}&pp=1`,
          cancel_url: `${base}&paid=cancel`,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: "paypal order failed" }, 502);
    const approve = (data.links ?? []).find((l: { rel: string; href: string }) => l.rel === "approve");
    if (!approve) return json({ error: "no approval url" }, 502);
    return json({ url: approve.href });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
