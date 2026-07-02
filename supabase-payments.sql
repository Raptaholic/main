-- ════════════════════════════════════════════════════════════
-- NOVU PEPTIDES — online payments migration (Stripe + PayPal)
-- Run this ONCE on your existing database, AFTER supabase-migration-security.sql.
-- Idempotent: safe to run more than once.
--
-- What it does:
--   * adds payment_status / payment_provider / payment_ref / paid_at to orders
--   * new orders always start payment_status = 'unpaid' (enforced on INSERT)
--   * ONLY the server (service-role edge-function webhooks) can flip an order to
--     'paid'. Customers can't (INSERT is pinned to 'unpaid') and even a
--     moderator session can't (UPDATE pins all four payment columns), so a
--     compromised dashboard can never fake a payment.
-- ════════════════════════════════════════════════════════════

-- ── payment columns ──
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists payment_ref text;
alter table public.orders add column if not exists paid_at timestamptz;

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('unpaid','paid','refunded')) not valid;

-- ── INSERT policy: same catalogue-anchored rules, plus payment_status must
--    start 'unpaid' so a client can't self-declare an order already paid. ──
drop policy if exists "anyone can place a clean order" on public.orders;
create policy "anyone can place a clean order"
  on public.orders for insert
  with check (
    status = 'processing'
    and subtotal >= 0 and delivery >= 0 and total >= 0
    and discount = 0
    and payment_status = 'unpaid'
    and confirmed_by is null and confirmed_at is null
    and delivered_at is null and cancelled_at is null
    and (account_email is null or account_email = auth.jwt()->>'email')
    and public.items_all_in_catalog(items)
    and subtotal = public.catalog_subtotal(items)
    and subtotal = public.items_subtotal(items)
    and total = subtotal + delivery
  );

-- ── moderator UPDATE policy: same PII/money pins, plus the four payment
--    columns are pinned to their stored values. Marking an order paid is done
--    only by the payment webhooks (service role, which bypasses RLS). ──
drop policy if exists "moderators update orders" on public.orders;
create policy "moderators update orders"
  on public.orders for update
  using (public.is_moderator(auth.uid()))
  with check (
    public.is_moderator(auth.uid())
    and customer = (select o.customer from public.orders o where o.id = orders.id)
    and items    = (select o.items    from public.orders o where o.id = orders.id)
    and subtotal = (select o.subtotal from public.orders o where o.id = orders.id)
    and discount = (select o.discount from public.orders o where o.id = orders.id)
    and total    = (select o.total    from public.orders o where o.id = orders.id)
    and account_email    is not distinct from (select o.account_email    from public.orders o where o.id = orders.id)
    and payment_status   is not distinct from (select o.payment_status   from public.orders o where o.id = orders.id)
    and payment_provider is not distinct from (select o.payment_provider from public.orders o where o.id = orders.id)
    and payment_ref      is not distinct from (select o.payment_ref      from public.orders o where o.id = orders.id)
    and paid_at          is not distinct from (select o.paid_at          from public.orders o where o.id = orders.id)
  );
