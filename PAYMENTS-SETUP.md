# Online Payments Setup (Stripe + PayPal)

This wires **automated online card payments (Stripe)** and **PayPal** into the
checkout. The amount charged is always read from the database order total on the
server — never from the browser — so a tampered client can't change what it pays.

> **Currency note:** Stripe charges in **AED**. PayPal has **no AED support**, so
> PayPal is billed in **USD** using a conversion rate you set (`AED_USD_RATE`).

---

## How it works

1. Customer picks **Pay Online (Card)** or **PayPal** and clicks *Place Order*.
2. The order is saved (`payment_status = 'unpaid'`) with a server-fixed total.
3. The page calls the `create-checkout` edge function → gets a Stripe/PayPal pay URL → redirects there.
4. Customer pays on Stripe's / PayPal's hosted page.
5. The order is marked **paid**:
   - **Stripe** → the `stripe-webhook` function (verified Stripe signature).
   - **PayPal** → the `paypal-capture` function when the customer returns.
6. Abandoned payments simply stay **unpaid** — no money moves; you follow up or the customer chooses Cash on Delivery.

Only the server (service-role) can mark an order paid. Customers can't (INSERT is
pinned to `unpaid`) and neither can a moderator session (UPDATE pins the payment
columns).

---

## 1. Run the database migration

In Supabase → SQL Editor, run **`supabase-payments.sql`** (after you've already
run `supabase-migration-security.sql`). It adds the payment columns and locks the
policies. It's idempotent.

## 2. Install the Supabase CLI & link the project

```bash
npm i -g supabase
supabase login
supabase link --project-ref ndoccmonyfmudxviymyv
```

## 3. Set the secrets (NEVER commit these)

Get **test** keys first, switch to live later.

| Secret | Where to get it |
|---|---|
| `SITE_URL` | Your live site origin, e.g. `https://novupeptides.com` (no trailing slash) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → **Secret key** (`sk_test_…` / `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Created in step 5 (`whsec_…`) |
| `PAYPAL_ENV` | `sandbox` while testing, `live` in production |
| `PAYPAL_CLIENT_ID` | PayPal Developer → Apps & Credentials → your app |
| `PAYPAL_SECRET` | Same app → Secret |
| `AED_USD_RATE` | AED→USD rate for PayPal, e.g. `0.2723` |

```bash
supabase secrets set \
  SITE_URL="https://novupeptides.com" \
  STRIPE_SECRET_KEY="sk_test_..." \
  PAYPAL_ENV="sandbox" \
  PAYPAL_CLIENT_ID="..." \
  PAYPAL_SECRET="..." \
  AED_USD_RATE="0.2723"
```

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do
> not set them yourself, and never put the service-role key in the website.

## 4. Deploy the functions

```bash
supabase functions deploy create-checkout
supabase functions deploy paypal-capture
supabase functions deploy stripe-webhook --no-verify-jwt
```

`stripe-webhook` uses `--no-verify-jwt` because Stripe calls it directly (it's
authenticated by the Stripe signature instead). This is also set in
`supabase/config.toml`.

## 5. Create the Stripe webhook

1. Stripe Dashboard → Developers → **Webhooks** → *Add endpoint*.
2. URL: `https://ndoccmonyfmudxviymyv.supabase.co/functions/v1/stripe-webhook`
3. Event to send: **`checkout.session.completed`**
4. Copy the endpoint's **Signing secret** (`whsec_…`) and set it:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
```

(Setting/rotating a secret needs a redeploy to take effect:
`supabase functions deploy stripe-webhook --no-verify-jwt`.)

## 6. Test

- **Stripe test card:** `4242 4242 4242 4242`, any future expiry, any CVC.
- **PayPal:** use a sandbox buyer account (PayPal Developer → Sandbox → Accounts).
- Place an order → pay → confirm the order flips to **Paid** in the dashboard.

## 7. Go live

1. Swap Stripe to **live** keys (`sk_live_…`) and create a **live** webhook (repeat step 5 with the live signing secret).
2. Set `PAYPAL_ENV=live` and use your **live** PayPal app credentials.
3. Set `SITE_URL` to the production domain.
4. Redeploy the three functions.
5. Update `AED_USD_RATE` to a current rate (review it periodically).

---

## Security notes

- The charged amount is read from `orders.total` server-side — the browser can't alter it.
- Stripe payments are confirmed only via a **signature-verified** webhook.
- PayPal captures are verified server-side (status `COMPLETED` **and** the capture's `custom_id` must match the order id) before marking paid.
- Payment status can only be set to `paid` by the service-role functions; RLS blocks customers and moderators from faking it.
- No secret keys live in the website or the git repo — only the Stripe **publishable** key would ever be safe client-side, and this flow doesn't even need it (the redirect is created server-side).
