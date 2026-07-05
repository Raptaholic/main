-- ════════════════════════════════════════════════════════════
-- NOVU PEPTIDES - Supabase backend setup (canonical / fresh install)
-- Run this once in your Supabase project: SQL Editor > New query
--
-- If you ALREADY ran an earlier version of this file, do NOT re-run this
-- whole script (the CREATE TABLE statements will error with "already
-- exists"). Instead run supabase-migration-security.sql, which upgrades an
-- existing database to this hardened version idempotently.
-- ════════════════════════════════════════════════════════════

-- ── 1. PROFILES (one row per registered user) ──
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null default '',
  phone text not null default '',
  ref_code text unique not null default '',
  role text not null default 'customer',
  first_order_used boolean not null default false,
  pending_discount boolean not null default false,
  referred_by text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, ref_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'ref_code', upper(substr(md5(random()::text), 1, 7)))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is this user a moderator? (security definer avoids RLS recursion)
create or replace function public.is_moderator(uid uuid)
returns boolean
language sql security definer set search_path = public
as $$
  select exists(select 1 from profiles where id = uid and role = 'moderator');
$$;

alter table public.profiles enable row level security;

create policy "read own profile or moderator reads all"
  on public.profiles for select
  using (id = auth.uid() or public.is_moderator(auth.uid()));

-- A user may update only their own profile, and may NOT change privileged
-- columns (role / discount flags). The WITH CHECK pins those columns to their
-- currently-stored values, so a customer cannot self-promote to moderator or
-- grant themselves a discount by editing the row directly.
create policy "update own profile (non-privileged columns)"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and first_order_used = (select p.first_order_used from public.profiles p where p.id = auth.uid())
    and pending_discount = (select p.pending_discount from public.profiles p where p.id = auth.uid())
  );

-- Discount flags are mutated only through SECURITY DEFINER functions (place_order
-- and consume_discount), which run with table-owner rights and therefore bypass
-- the locked-down policy above while still only ever touching the caller's own row.
create or replace function public.consume_discount(rate numeric)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if rate = 0.30 then
    update profiles set pending_discount = false where id = auth.uid();
  elsif rate = 0.10 then
    update profiles set first_order_used = true where id = auth.uid();
  end if;
end;
$$;

-- ── 2. REFERRALS ──
-- Called by a newly signed-up user with the code they entered.
-- Gives the code owner a pending 30% discount.
create or replace function public.apply_referral(code text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare ref_email text;
begin
  -- Idempotency guard: a caller may only ever consume ONE referral. Without
  -- this, a user could call apply_referral in a loop (or from many throwaway
  -- accounts) to repeatedly re-arm the same referrer's 30% discount.
  if exists (select 1 from profiles where id = auth.uid() and referred_by is not null) then
    return false;
  end if;

  select email into ref_email
  from profiles
  where ref_code = upper(code) and role <> 'moderator' and id <> auth.uid()
  limit 1;
  if ref_email is null then return false; end if;

  -- Defense-in-depth: don't stack a second pending discount on a referrer who
  -- already has one waiting to be consumed.
  if exists (select 1 from profiles where email = ref_email and pending_discount = true) then
    update profiles set referred_by = ref_email where id = auth.uid();
    return false;
  end if;

  update profiles set pending_discount = true where email = ref_email;
  update profiles set referred_by = ref_email where id = auth.uid();
  return true;
end;
$$;

-- ── 2b. PRODUCTS (server-side price catalogue = source of truth) ──
-- Every order line's price is anchored to THIS table, never to the price the
-- browser sends. place_order() re-derives price/name/brand from here, and the
-- direct-INSERT policy rejects any basket whose ids or sums don't match. A
-- tampered client therefore cannot order a real product at a forged price.
--
-- ⚠️  WHEN UPDATING PRICES: Always update BOTH the products table (below) AND
-- the PRODUCTS array in index.html (around line 1283). If you change a price
-- in only one place, orders will fail with "subtotal mismatch" because the
-- client and server prices won't match.
create table public.products (
  id integer primary key,
  name text not null,
  brand text not null default '',
  cat text not null default '',
  price numeric not null check (price >= 0),
  active boolean not null default true
);

alter table public.products enable row level security;

-- The catalogue already ships publicly in the page, so allow anyone to read
-- ACTIVE products. There is deliberately NO insert/update/delete policy, so
-- prices can only ever be changed from the SQL editor / service role.
create policy "anyone can read active products"
  on public.products for select
  using (active);

insert into public.products (id, name, brand, cat, price) values
  (5, 'Masterone 200 - Drostanolone Enanthate', 'Dezel Labs', 'injectables', 572),
  (12, 'Danabol 100 Oral Drops', 'Dezel Labs', 'orals', 377),
  (80, 'ZPHC SEO Site Enhancement Oil 40ml', 'ZPHC', 'injectables', 390),
  (94, 'ZPHC Retatrutide 24mg', 'ZPHC', 'peptides', 1560),
  (95, 'ZPHC Tirzepatide 37.5mg Kit', 'ZPHC', 'peptides', 1950),
  (96, 'Pharma Test E 300', 'Pharmacom Labs', 'injectables', 384),
  (97, 'Pharma Test P 100', 'Pharmacom Labs', 'injectables', 325),
  (103, 'Pharma 3-Tren 200 (Tren Mix)', 'Pharmacom Labs', 'injectables', 533),
  (114, 'Cambridge Test-Prop 100', 'Cambridge Research', 'injectables', 338),
  (115, 'Cambridge HGH Fragment 176-191 (5mg x3)', 'Cambridge Research', 'peptides', 1105),
  (123, 'BPC-157 + TB-500 Blend 5/5mg', 'Peptide Sciences', 'peptides', 585),
  (125, 'NAD+ 1000mg', 'Peptide Sciences', 'peptides', 715),
  (126, 'VIP 6mg', 'Peptide Sciences', 'peptides', 520),
  (142, 'Pharma Grade BPC-157 5mg', 'Pharma Grade', 'peptides', 396),
  (143, 'Pharma Grade TB-500 5mg', 'Pharma Grade', 'peptides', 436),
  (144, 'Pharma Grade Semaglutide 5mg', 'Pharma Grade', 'peptides', 611),
  (145, 'Pharma Grade Tirzepatide 10mg', 'Pharma Grade', 'peptides', 741),
  (146, 'Pharma Grade HGH Fragment 5mg', 'Pharma Grade', 'peptides', 396),
  (148, 'Cali BioLab GLP-3 RT Retatrutide 30mg', 'Biolab', 'peptides', 2340),
  (149, '5-Amino-1MQ 5mg Vial', 'Biolab', 'peptides', 585),
  (190, 'TRT - Testosterone Support', 'Applied Nutrition', 'vitamins', 351),
  (191, 'Organ Shield - Liver, Kidney & Heart', 'Applied Nutrition', 'vitamins', 338),
  (192, 'Sleep - Unwind & Recover', 'Applied Nutrition', 'vitamins', 318),
  (193, 'Prostate Support', 'Applied Nutrition', 'vitamins', 325),
  (194, 'Joint Complex - Advanced Formula', 'Applied Nutrition', 'vitamins', 332),
  (195, 'Turmeric 800mg', 'Applied Nutrition', 'vitamins', 306),
  (196, 'Relax & Calm', 'Applied Nutrition', 'vitamins', 306),
  (197, 'Gut Health', 'Applied Nutrition', 'vitamins', 312),
  (198, 'Detox & Debloat', 'Applied Nutrition', 'vitamins', 312),
  (199, 'Brain Fuel - Focus & Clarity', 'Applied Nutrition', 'vitamins', 315),
  (204, 'Revive Liver - Liver Management', 'Revive MD', 'vitamins', 529),
  (205, 'Revive Daily Greens - Fresh Berry', 'Revive MD', 'vitamins', 530),
  (242, 'Liver Stack - Dean St Mart', 'Supplement Needs', 'vitamins', 566),
  (243, 'Heart Stack - Dean St Mart', 'Supplement Needs', 'vitamins', 566),
  (244, 'Kidney & Blood Pressure Stack', 'Supplement Needs', 'vitamins', 566),
  (245, 'Multivitamin & Mineral Pro', 'Supplement Needs', 'vitamins', 403),
  (251, 'Spectrum Tirzepatide 10mg', 'Spectrum Pharma', 'peptides', 650),
  (252, 'DNA Pro Tirzepatide 6mg', 'DNA Pro', 'peptides', 845),
  (253, 'DNA Pro Tirzepatide 15mg', 'DNA Pro', 'peptides', 1495),
  (254, 'DNA Pro Tirzepatide 30mg', 'DNA Pro', 'peptides', 2015),
  (255, 'Cambridge Mounjaro 5mg', 'Cambridge Research', 'peptides', 520),
  (256, 'ZPHC Tirzepatide AQ 30mg', 'ZPHC', 'peptides', 1365),
  (257, 'Genovare Tirzepatide 2mg', 'Genovare', 'peptides', 845),
  (258, 'Genovare Semax Spray 50mg', 'Genovare', 'peptides', 618),
  (259, 'DNA Pro Semax 15mg', 'DNA Pro', 'peptides', 559),
  (260, 'Biolab N-Acetyl Semax 50mg', 'Biolab', 'peptides', 644),
  (261, 'Genovare Semax Pen 25mg', 'Genovare', 'peptides', 1053),
  (262, 'Genovare Selank+Semax Pen', 'Genovare', 'peptides', 806),
  (263, 'Biolab PT-141 10mg', 'Biolab', 'peptides', 500),
  (264, 'Cambridge PT-141 30mg', 'Cambridge Research', 'peptides', 650),
  (265, 'Biolab Ipamorelin 2mg', 'Biolab', 'peptides', 390),
  (266, 'Biolab Ipamorelin+MOD GRF(1-29)', 'Biolab', 'peptides', 507),
  (267, 'Genovare Tesamorelin+Ipa+CJC Pen', 'Genovare', 'peptides', 832),
  (268, 'CJCtech CJC-1295 No DAC 2mg', 'CJCtech', 'peptides', 845),
  (269, 'Cambridge CJC-1295 No DAC', 'Cambridge Research', 'peptides', 1170),
  (270, 'Nomad Lab CJC-1295', 'Nomad Lab', 'peptides', 1170),
  (271, 'Biolab CJC-1295 No DAC 5mg', 'Biolab', 'peptides', 429),
  (272, 'Biolab CJC-1295 with DAC 10mg', 'Biolab', 'peptides', 624),
  (273, 'DNA Pro CJC-1295+Ipa Pen 50mg', 'DNA Pro', 'peptides', 1365),
  (274, 'Cambridge TB-500 15mg', 'Cambridge Research', 'peptides', 650),
  (275, 'ZPHC TB-500 25mg', 'ZPHC', 'peptides', 650),
  (276, 'Biolab TB-500+BPC-157 Mix', 'Biolab', 'peptides', 741),
  (277, 'Genovare TB-500+HGH Fragment 30mg', 'Genovare', 'peptides', 1365),
  (278, 'Genovare GHK-Cu Pen 100mg', 'Genovare', 'peptides', 780),
  (279, 'ZPHC GHK-Cu 60mg', 'ZPHC', 'peptides', 455),
  (280, 'Cambridge GHK-Cu 600mg', 'Cambridge Research', 'peptides', 1482),
  (281, 'Peptide Sciences MK-677 12.5mg', 'Peptide Sciences', 'peptides', 845),
  (282, 'Biolab MK-677 10mg', 'Biolab', 'peptides', 604),
  (283, 'Genovare Retatrutide 30mg Pen', 'Genovare', 'peptides', 1365),
  (284, 'ZPHC GHRP-6 25mg', 'ZPHC', 'peptides', 520),
  (285, 'Biolab BPC-157 10mg', 'Biolab', 'peptides', 520),
  (286, 'Peptide Sciences BPC-157 Acetyl 500mcg', 'Peptide Sciences', 'peptides', 1105),
  (287, 'ZPHC Glow Mix 60mg', 'ZPHC', 'peptides', 604),
  (288, 'Body Tech Primo Depot 100mg/ml', 'Body Tech', 'injectables', 370),
  (289, 'DNA Pro GHK-Cu Pen 500mg', 'DNA Pro', 'peptides', 1495),
  (290, 'Biolab Beauty GHK-Cu Intense Cream', 'Biolab', 'peptides', 611),
  (291, 'Biolab Beauty GHK-Cu Medium Cream', 'Biolab', 'peptides', 611),
  (292, 'InSarm UNI-Yohimbine 5mg', 'InSarm Labs', 'fatloss', 358)
on conflict (id) do update set
  name = excluded.name, brand = excluded.brand, cat = excluded.cat,
  price = excluded.price, active = true;

-- ── 3. ORDERS ──
create table public.orders (
  -- id is client-supplied (NP-XXXX…); constrain the format so a forged INSERT
  -- can't smuggle HTML/script into the id that later renders in the dashboard.
  id text primary key check (id ~ '^NP-[A-Z0-9]{4,40}$'),
  created_at timestamptz not null default now(),
  -- status is restricted to the four known values so a forged/compromised write
  -- can't store arbitrary markup that later renders via statusLabel().
  status text not null default 'processing'
    check (status in ('processing','confirmed','delivered','cancelled')),
  processing_ends_at timestamptz,
  delivery_estimate text,
  confirmed_by text,
  confirmed_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text,
  customer jsonb not null,
  items jsonb not null,
  subtotal numeric not null,
  discount numeric not null default 0,
  discount_label text default '',
  delivery numeric not null default 30,
  total numeric not null,
  account_email text,
  -- Payment state. Only the server (service-role edge-function webhooks) ever
  -- flips this to 'paid'; the INSERT policy pins new rows to 'unpaid' and the
  -- moderator UPDATE policy pins these columns, so a payment cannot be faked.
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded')),
  payment_provider text,
  payment_ref text,
  paid_at timestamptz,
  -- 5% UAE VAT and the card processing fee, both re-derived in place_order.
  vat numeric not null default 0,
  fee numeric not null default 0
);

-- Every item must have a plain-integer qty in 1..99 and a non-negative numeric
-- price. A CHECK constraint cannot contain a subquery, so the per-element scan
-- lives in this IMMUTABLE helper. This blocks the stored-XSS-via-qty, the
-- absurd-quantity abuse, and malformed price payloads on EVERY write path
-- (direct INSERT and the place_order RPC alike).
create or replace function public.items_ok(items jsonb)
returns boolean
language sql immutable
as $$
  select coalesce(
    bool_and(
      (elem->>'id')    ~ '^[0-9]+$'
      and (elem->>'qty')   ~ '^[0-9]+$' and (elem->>'qty')::int between 1 and 99
      and (elem->>'price') ~ '^[0-9]+(\.[0-9]+)?$' and (elem->>'price')::numeric >= 0
    ),
    false
  )
  from jsonb_array_elements(items) elem;
$$;

-- Sum of (price × qty) over the line items. Used to force the stored `subtotal`
-- to actually match the items presented, so an order cannot claim real products
-- while declaring a near-zero subtotal/total. (Item PRICES themselves are still
-- client-supplied — there is no server-side product catalogue to anchor them to;
-- closing that fully would require a products price table.)
create or replace function public.items_subtotal(items jsonb)
returns numeric
language sql immutable
as $$
  select coalesce(sum((elem->>'price')::numeric * (elem->>'qty')::int), 0)
  from jsonb_array_elements(items) elem;
$$;

-- ── catalogue-anchored helpers (price source of truth = products table) ──
-- SECURITY DEFINER so they always see the full catalogue regardless of the
-- products RLS policy, and behave identically inside an RLS policy and the
-- place_order RPC. They only READ, using the jsonb the caller passes.

-- Sum of (CATALOGUE price × qty). Line items whose id is unknown/inactive add
-- nothing, so this is always paired with items_all_in_catalog() below to reject
-- baskets that reference products which don't exist.
create or replace function public.catalog_subtotal(items jsonb)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(p.price * (elem->>'qty')::int), 0)
  from jsonb_array_elements(items) elem
  join public.products p on p.id = (elem->>'id')::int and p.active;
$$;

-- True only if EVERY line item maps to a live (active) catalogue product.
-- Blocks the "order real goods under a fake id at price 0" abuse on the direct
-- INSERT path (place_order enforces the same via a count check).
create or replace function public.items_all_in_catalog(items jsonb)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(bool_and(
    exists (select 1 from public.products p where p.id = (elem->>'id')::int and p.active)
  ), false)
  from jsonb_array_elements(items) elem;
$$;

alter table public.orders
  add constraint orders_items_ok_check check (public.items_ok(items));

alter table public.orders enable row level security;

-- Guests and members can place orders directly, but the row is constrained so a
-- direct anon INSERT cannot forge a privileged/abusive order:
--   * status must start as 'processing' (can't self-mark delivered/confirmed)
--   * money fields must be non-negative
--   * every item id must reference a live product, and the subtotal must equal
--     the CATALOGUE sum (server price × qty) — not a client-declared price — so
--     a forged INSERT can neither invent a fake price nor use a fake product id
--   * the client's own line prices must also sum to that subtotal
--   * the TOTAL arithmetic must be exact
--   * discount MUST be 0 on this path. Any discounted order has to go through the
--     place_order() RPC, which re-derives the authorized rate AND consumes the
--     discount flag atomically. This stops a client from replaying a direct
--     INSERT with a discount it never consumes (repeatable-discount abuse).
--   * cannot attach an order to another logged-in user's account email
--     (guests send account_email = null; members must match their own JWT)
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

-- Customers see their own orders; moderators see everything
create policy "read own orders or moderator reads all"
  on public.orders for select
  using (account_email = auth.jwt()->>'email' or public.is_moderator(auth.uid()));

-- Only moderators can update orders, and ONLY the operational columns (status,
-- delivery estimate, confirm/cancel/deliver metadata). The WITH CHECK pins the
-- customer PII, items and all money fields to their stored values so even a
-- compromised moderator session cannot rewrite a customer's address or totals.
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

-- ── 3b. ATOMIC ORDER PLACEMENT (closes the discount double-spend race AND
--        anchors every price to the server catalogue) ──
-- The client calls this RPC instead of a bare INSERT. It:
--   1. rebuilds the basket from the SERVER products table (trusted price / name
--      / brand; only the qty comes from the client), so a tampered browser can
--      neither forge a price nor inject a fake product name into the stored row;
--   2. re-derives the authorized discount from the caller's LIVE profile row
--      (locked FOR UPDATE);
--   3. validates the totals, inserts the rebuilt order, and consumes the
--      discount flag — all in ONE transaction.
-- Because the profile row is locked, two concurrent orders for the same user
-- serialize: the second sees the already-cleared flag and cannot reuse it.
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

  -- Rebuild the basket from the catalogue: trusted id/name/brand/price, with the
  -- client supplying ONLY the quantity. v_items is what actually gets stored, so
  -- the dashboard renders catalogue data, not attacker-controlled strings.
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

  -- Every line item must map to a live catalogue product…
  if v_count <> jsonb_array_length(p_items) then
    raise exception 'unknown or inactive product';
  end if;
  -- …and the price the client showed the customer must equal the catalogue sum.
  if p_subtotal <> v_subtotal then
    raise exception 'subtotal mismatch';
  end if;
  if p_account_email is not null and p_account_email is distinct from v_jwt_email then
    raise exception 'account email mismatch';
  end if;

  -- Authorized discount comes from the live profile, never from the client, and
  -- is computed against the SERVER subtotal.
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

  -- VAT (5% of goods after discount) + card fee, all re-derived here so the
  -- browser can't change what is charged. COD pays no card fee.
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

-- ── 4. LIVE DASHBOARD UPDATES ──
-- REPLICA IDENTITY FULL lets Realtime evaluate Row Level Security against the
-- full row on UPDATE/DELETE so change broadcasts honour the SELECT policy above
-- (customers only get their own orders, moderators get all, anon gets none).
alter table public.orders replica identity full;
alter publication supabase_realtime add table public.orders;
-- IMPORTANT: in the Supabase dashboard, Database > Replication > supabase_realtime,
-- confirm "Enable Row Level Security" is ON for the orders table. Without it,
-- Realtime can broadcast full customer PII to any subscriber regardless of RLS.

-- ════════════════════════════════════════════════════════════
-- 5. PROMOTE MODERATORS - run AFTER Tom and John have created
--    their accounts on the website (use their REAL emails):
--
-- update public.profiles
--   set role = 'moderator', first_order_used = true
--   where email in ('tom@novupeptides.com', 'john@novupeptides.com');
-- ════════════════════════════════════════════════════════════
