// ─────────────────────────────────────────────────────────────────────────
// stripe-webhook — mark an order paid when Stripe confirms the payment.
//
// Stripe calls this endpoint directly (no Supabase JWT), so this function must
// be deployed with verify_jwt = false (see supabase/config.toml). The request
// is authenticated instead by verifying the Stripe signature against
// STRIPE_WEBHOOK_SECRET — an attacker cannot forge a "paid" event.
//
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Then in the Stripe dashboard add a webhook to this function's URL for the
// event  checkout.session.completed  and copy its signing secret.
// ─────────────────────────────────────────────────────────────────────────
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const WHSEC = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!sig || !WHSEC) return new Response("missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, WHSEC, undefined, cryptoProvider);
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const orderId = s.client_reference_id ?? (s.metadata?.orderId as string | undefined);
    if (orderId && s.payment_status === "paid") {
      // Only ever flips unpaid → paid; never overwrites a settled row.
      await admin.from("orders")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          payment_provider: "stripe",
          payment_ref: typeof s.payment_intent === "string" ? s.payment_intent : s.id,
        })
        .eq("id", orderId)
        .eq("payment_status", "unpaid");
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
