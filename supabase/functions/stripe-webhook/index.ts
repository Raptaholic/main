// ─────────────────────────────────────────────────────────────────────────
// stripe-webhook — mark an order paid when Stripe confirms the payment, then
// notify the store. Deployed with verify_jwt = false; the request is
// authenticated by verifying the Stripe signature against STRIPE_WEBHOOK_SECRET.
//
// The store is notified ONLY here, i.e. only after a real payment lands, so an
// abandoned or failed online payment never reaches the store. (COD orders are
// notified immediately by the client, since they are settled on delivery.)
//
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
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
      // Only ever flips unpaid → paid; the returned rows tell us we actually
      // flipped it (so the store email fires exactly once, never on replay).
      const { data: flipped } = await admin.from("orders")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          payment_provider: "stripe",
          payment_ref: typeof s.payment_intent === "string" ? s.payment_intent : s.id,
        })
        .eq("id", orderId)
        .eq("payment_status", "unpaid")
        .select("id,customer,items,subtotal,discount,discount_label,delivery,vat,fee,total,payment_provider");
      if (flipped && flipped.length) await notifyStore(flipped[0]);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
