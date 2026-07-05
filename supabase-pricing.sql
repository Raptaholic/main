-- ════════════════════════════════════════════════════════════
-- NOVU PEPTIDES — VAT + card-fee pricing migration
-- Run ONCE on your existing database, AFTER supabase-payments.sql.
-- Idempotent: safe to re-run.
--
-- Adds 5% VAT and a card processing fee to every order, recomputed and
-- verified SERVER-SIDE in place_order so the browser can never change what is
-- actually charged. Only card payments incur the fee; Cash on Delivery does not.
-- ════════════════════════════════════════════════════════════

alter table public.orders add column if not exists vat numeric not null default 0;
alter table public.orders add column if not exists fee numeric not null default 0;

-- ── INSERT policy: direct (fallback) path is COD-only — no discount, no fee,
--    VAT = 5% of the catalogue subtotal, exact total. Card / discounted orders
--    must go through place_order(). ──
drop policy if exists "anyone can place a clean order" on public.orders;
create policy "anyone can place a clean order"
  on public.orders for insert
  with check (
    status = 'processing'
    and subtotal >= 0 and delivery >= 0 and total >= 0
    and discount = 0
    and fee = 0
    and payment_status = 'unpaid'
    and confirmed_by is null and confirmed_at is null
    and delivered_at is null and cancelled_at is null
    and (account_email is null or account_email = auth.jwt()->>'email')
    and public.items_all_in_catalog(items)
    and subtotal = public.catalog_subtotal(items)
    and subtotal = public.items_subtotal(items)
    and vat = round(subtotal * 0.05, 2)
    and total = round(subtotal + delivery + vat, 2)
  );

-- ── moderator UPDATE policy: also pin vat + fee alongside the other money. ──
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
    and vat      = (select o.vat      from public.orders o where o.id = orders.id)
    and fee      = (select o.fee      from public.orders o where o.id = orders.id)
    and total    = (select o.total    from public.orders o where o.id = orders.id)
    and account_email    is not distinct from (select o.account_email    from public.orders o where o.id = orders.id)
    and payment_status   is not distinct from (select o.payment_status   from public.orders o where o.id = orders.id)
    and payment_provider is not distinct from (select o.payment_provider from public.orders o where o.id = orders.id)
    and payment_ref      is not distinct from (select o.payment_ref      from public.orders o where o.id = orders.id)
    and paid_at          is not distinct from (select o.paid_at          from public.orders o where o.id = orders.id)
  );

-- ── place_order: new signature adds p_vat, p_fee, p_pay_method. Drop the old
--    signature first (create-or-replace can't change the argument list). ──
drop function if exists public.place_order(
  text, timestamptz, jsonb, jsonb, numeric, numeric, text, numeric, numeric, text
);

create or replace function public.place_order(
  p_id text,
  p_processing_ends_at timestamptz,
  p_customer jsonb,
  p_items jsonb,
  p_subtotal numeric,
  p_discount numeric,
  p_discount_label text,
  p_delivery numeric,
  p_vat numeric,
  p_fee numeric,
  p_pay_method text,
  p_total numeric,
  p_account_email text
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_pending boolean := false;
  v_fou boolean := true;
  v_authorized numeric := 0;
  v_jwt_email text := auth.jwt()->>'email';
  v_items jsonb;
  v_subtotal numeric;
  v_count int;
  v_taxable numeric;
  v_vat numeric;
  v_fee_pct numeric;
  v_fee numeric;
  v_total numeric;
begin
  if p_id !~ '^NP-[A-Z0-9]{4,40}$' then
    raise exception 'invalid order id';
  end if;
  if p_pay_method not in ('cod','card-stripe','card-paypal') then
    raise exception 'invalid payment method';
  end if;
  if p_discount < 0 or p_delivery < 0 or p_vat < 0 or p_fee < 0 or p_total < 0 then
    raise exception 'invalid amounts';
  end if;
  if not public.items_ok(p_items) then
    raise exception 'invalid items';
  end if;

  -- Rebuild the basket from the catalogue (trusted price/name/brand, client qty).
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', x.id, 'name', x.name, 'brand', x.brand, 'price', x.price, 'qty', x.qty
    ) order by x.ord), '[]'::jsonb),
    coalesce(sum(x.price * x.qty), 0),
    count(*)
  into v_items, v_subtotal, v_count
  from (
    select p.id, p.name, p.brand, p.price, (elem->>'qty')::int as qty, ord
    from jsonb_array_elements(p_items) with ordinality as e(elem, ord)
    join public.products p on p.id = (elem->>'id')::int and p.active
  ) x;

  if v_count <> jsonb_array_length(p_items) then
    raise exception 'unknown or inactive product';
  end if;
  if p_subtotal <> v_subtotal then
    raise exception 'subtotal mismatch';
  end if;
  if p_account_email is not null and p_account_email is distinct from v_jwt_email then
    raise exception 'account email mismatch';
  end if;

  -- Authorized discount from the live profile (locked), computed on the subtotal.
  if auth.uid() is not null then
    select pending_discount, first_order_used
      into v_pending, v_fou
      from profiles where id = auth.uid()
      for update;
  end if;
  if v_pending then
    v_authorized := round(v_subtotal * 0.30);
  elsif not v_fou then
    v_authorized := round(v_subtotal * 0.10);
  else
    v_authorized := 0;
  end if;
  if p_discount > v_authorized or p_discount > v_subtotal then
    raise exception 'discount not authorized';
  end if;

  -- VAT (5% of goods after discount) + card fee, all re-derived here.
  v_taxable := v_subtotal - p_discount;
  v_vat := round(v_taxable * 0.05, 2);
  v_fee_pct := case p_pay_method
    when 'card-stripe' then 0.029
    when 'card-paypal' then 0.039
    else 0 end;
  v_fee := round((v_taxable + p_delivery + v_vat) * v_fee_pct, 2);
  v_total := round(v_taxable + p_delivery + v_vat + v_fee, 2);

  if p_vat <> v_vat then raise exception 'vat mismatch'; end if;
  if p_fee <> v_fee then raise exception 'fee mismatch'; end if;
  if p_total <> v_total then raise exception 'total mismatch'; end if;

  insert into public.orders(
    id, status, processing_ends_at, customer, items,
    subtotal, discount, discount_label, delivery, vat, fee, total, account_email
  ) values (
    p_id, 'processing', p_processing_ends_at, p_customer, v_items,
    v_subtotal, p_discount, p_discount_label, p_delivery, v_vat, v_fee, v_total, p_account_email
  );

  if p_discount > 0 and auth.uid() is not null then
    if v_pending then
      update profiles set pending_discount = false where id = auth.uid();
    elsif not v_fou then
      update profiles set first_order_used = true where id = auth.uid();
    end if;
  end if;
end;
$$;

grant execute on function public.place_order(
  text, timestamptz, jsonb, jsonb, numeric, numeric, text, numeric, numeric, numeric, text, numeric, text
) to anon, authenticated;
