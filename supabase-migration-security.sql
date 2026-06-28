-- ════════════════════════════════════════════════════════════
-- NOVU PEPTIDES — security hardening migration
-- Run this ONCE on an EXISTING database that was created with an earlier
-- version of supabase-setup.sql. It is idempotent: safe to run more than once.
--
-- What it does:
--   * products        → NEW server-side price catalogue (source of truth)
--   * apply_referral  → adds idempotency guards (no unlimited discount re-arming)
--   * place_order     → atomic RPC; re-derives prices from the catalogue
--   * orders INSERT   → enforces exact total + catalogue-anchored subtotal
--   * orders UPDATE   → pins PII/items/money so a compromised mod can't rewrite them
--   * CHECK constraints → status whitelist + per-item qty 1..99 (blocks qty XSS)
--   * Realtime        → REPLICA IDENTITY FULL so RLS applies to change broadcasts
-- ════════════════════════════════════════════════════════════

-- ── products: server-side price catalogue (source of truth for all prices) ──
-- Order prices are re-derived from THIS table, never trusted from the browser.
create table if not exists public.products (
  id integer primary key,
  name text not null,
  brand text not null default '',
  cat text not null default '',
  price numeric not null check (price >= 0),
  active boolean not null default true
);

alter table public.products enable row level security;
drop policy if exists "anyone can read active products" on public.products;
create policy "anyone can read active products"
  on public.products for select
  using (active);

-- Seed / refresh the catalogue. Re-running updates prices and re-activates rows.
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
  (155, 'Godzilla 5-SARM Stack 90 Caps', 'Lawless Labs', 'sarms', 533),
  (156, 'King Kong SARM S-23 90 Caps', 'Lawless Labs', 'sarms', 500),
  (157, 'Ligandrol LGD-4033 Liquid 30ml', 'Lawless Labs', 'sarms', 488),
  (170, 'Uni-Sten SR-9009 Stenabolic', 'Unisarm Labs', 'sarms', 488),
  (171, 'Uni-Tamoren MK-677 Ibutamoren', 'Unisarm Labs', 'sarms', 488),
  (172, 'Uni-Mix III (LGD + MK-677 + RAD-140)', 'Unisarm Labs', 'sarms', 611),
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
  (292, 'InSarm UNI-Yohimbine 5mg', 'InSarm Labs', 'fatloss', 358),
  (293, 'XSarm X-Tamoren MK-677', 'XSarm', 'sarms', 546),
  (294, 'InSarm UNI-Tamoren MK-677 10mg', 'InSarm Labs', 'sarms', 403)
on conflict (id) do update set
  name = excluded.name, brand = excluded.brand, cat = excluded.cat,
  price = excluded.price, active = true;

-- ── apply_referral: idempotency guards ──
create or replace function public.apply_referral(code text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare ref_email text;
begin
  if exists (select 1 from profiles where id = auth.uid() and referred_by is not null) then
    return false;
  end if;

  select email into ref_email
  from profiles
  where ref_code = upper(code) and role <> 'moderator' and id <> auth.uid()
  limit 1;
  if ref_email is null then return false; end if;

  if exists (select 1 from profiles where email = ref_email and pending_discount = true) then
    update profiles set referred_by = ref_email where id = auth.uid();
    return false;
  end if;

  update profiles set pending_discount = true where email = ref_email;
  update profiles set referred_by = ref_email where id = auth.uid();
  return true;
end;
$$;

-- ── consume_discount: kept for the client's fallback insert path ──
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

-- ── per-item validator + line-item subtotal (CHECK can't hold a subquery) ──
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

create or replace function public.items_subtotal(items jsonb)
returns numeric
language sql immutable
as $$
  select coalesce(sum((elem->>'price')::numeric * (elem->>'qty')::int), 0)
  from jsonb_array_elements(items) elem;
$$;

-- ── catalogue-anchored helpers (price source of truth = products table) ──
-- SECURITY DEFINER so they always read the full catalogue and behave the same
-- inside an RLS policy and the place_order RPC.
create or replace function public.catalog_subtotal(items jsonb)
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(p.price * (elem->>'qty')::int), 0)
  from jsonb_array_elements(items) elem
  join public.products p on p.id = (elem->>'id')::int and p.active;
$$;

create or replace function public.items_all_in_catalog(items jsonb)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(bool_and(
    exists (select 1 from public.products p where p.id = (elem->>'id')::int and p.active)
  ), false)
  from jsonb_array_elements(items) elem;
$$;

-- ── CHECK constraints (NOT VALID so pre-existing rows don't block the migration;
--    they still enforce every NEW write). Drop-then-add makes this re-runnable. ──
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('processing','confirmed','delivered','cancelled')) not valid;

-- drop the old qty-only constraint name if a prior run created it
alter table public.orders drop constraint if exists orders_items_qty_check;
alter table public.orders drop constraint if exists orders_items_ok_check;
alter table public.orders
  add constraint orders_items_ok_check
  check (public.items_ok(items)) not valid;

-- ── orders INSERT policy: exact total + authorized discount cap ──
drop policy if exists "anyone can place a clean order" on public.orders;
create policy "anyone can place a clean order"
  on public.orders for insert
  with check (
    status = 'processing'
    and subtotal >= 0 and delivery >= 0 and total >= 0
    and discount = 0
    and confirmed_by is null and confirmed_at is null
    and delivered_at is null and cancelled_at is null
    and (account_email is null or account_email = auth.jwt()->>'email')
    and public.items_all_in_catalog(items)
    and subtotal = public.catalog_subtotal(items)
    and subtotal = public.items_subtotal(items)
    and total = subtotal + delivery
  );

-- ── orders UPDATE policy: pin immutable columns ──
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
    and account_email is not distinct from (select o.account_email from public.orders o where o.id = orders.id)
  );

-- ── atomic place_order RPC (now also re-derives prices from the catalogue) ──
create or replace function public.place_order(
  p_id text,
  p_processing_ends_at timestamptz,
  p_customer jsonb,
  p_items jsonb,
  p_subtotal numeric,
  p_discount numeric,
  p_discount_label text,
  p_delivery numeric,
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
begin
  if p_id !~ '^NP-[A-Z0-9]{4,40}$' then
    raise exception 'invalid order id';
  end if;
  if p_discount < 0 or p_delivery < 0 or p_total < 0 then
    raise exception 'invalid amounts';
  end if;
  if not public.items_ok(p_items) then
    raise exception 'invalid items';
  end if;

  -- Rebuild the basket from the catalogue: trusted id/name/brand/price, with the
  -- client supplying ONLY the quantity. v_items is what gets stored.
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
  if p_total <> v_subtotal + p_delivery - p_discount then
    raise exception 'total mismatch';
  end if;

  insert into public.orders(
    id, status, processing_ends_at, customer, items,
    subtotal, discount, discount_label, delivery, total, account_email
  ) values (
    p_id, 'processing', p_processing_ends_at, p_customer, v_items,
    v_subtotal, p_discount, p_discount_label, p_delivery, p_total, p_account_email
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
  text, timestamptz, jsonb, jsonb, numeric, numeric, text, numeric, numeric, text
) to anon, authenticated;

-- ── Realtime: make RLS apply to change broadcasts ──
alter table public.orders replica identity full;
-- Add to the realtime publication only if not already a member (re-runnable).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
-- IMPORTANT (dashboard step): Database > Replication > supabase_realtime,
-- confirm "Enable Row Level Security" is ON for the orders table.

-- ════════════════════════════════════════════════════════════
-- After this runs cleanly, optionally validate the new CHECK constraints
-- against existing rows (only if you're confident no legacy row violates them):
--   alter table public.orders validate constraint orders_status_check;
--   alter table public.orders validate constraint orders_items_qty_check;
-- ════════════════════════════════════════════════════════════
