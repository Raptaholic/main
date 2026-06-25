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
  account_email text
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
      (elem->>'qty')   ~ '^[0-9]+$' and (elem->>'qty')::int between 1 and 99
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

alter table public.orders
  add constraint orders_items_ok_check check (public.items_ok(items));

alter table public.orders enable row level security;

-- Guests and members can place orders directly, but the row is constrained so a
-- direct anon INSERT cannot forge a privileged/abusive order:
--   * status must start as 'processing' (can't self-mark delivered/confirmed)
--   * money fields must be non-negative
--   * subtotal must equal the sum of the line items (no real-items/AED-1 total)
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
    and confirmed_by is null and confirmed_at is null
    and delivered_at is null and cancelled_at is null
    and (account_email is null or account_email = auth.jwt()->>'email')
    and subtotal = public.items_subtotal(items)
    and total = subtotal + delivery
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
    and total    = (select o.total    from public.orders o where o.id = orders.id)
    and account_email is not distinct from (select o.account_email from public.orders o where o.id = orders.id)
  );

-- ── 3b. ATOMIC ORDER PLACEMENT (closes the discount double-spend race) ──
-- The client calls this RPC instead of a bare INSERT. It re-derives the
-- authorized discount from the caller's LIVE profile row (locked FOR UPDATE),
-- validates the total, inserts the order, and consumes the discount flag — all
-- in ONE transaction. Because the profile row is locked, two concurrent orders
-- for the same user serialize: the second sees the already-cleared flag and
-- cannot reuse the discount.
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
begin
  if p_id !~ '^NP-[A-Z0-9]{4,40}$' then
    raise exception 'invalid order id';
  end if;
  if p_subtotal < 0 or p_discount < 0 or p_delivery < 0 or p_total < 0 then
    raise exception 'invalid amounts';
  end if;
  if not public.items_ok(p_items) then
    raise exception 'invalid items';
  end if;
  -- subtotal must reflect the actual line items (no real-items/near-zero total)
  if p_subtotal <> public.items_subtotal(p_items) then
    raise exception 'subtotal mismatch';
  end if;
  if p_account_email is not null and p_account_email is distinct from v_jwt_email then
    raise exception 'account email mismatch';
  end if;

  -- Authorized discount comes from the live profile, never from the client.
  if auth.uid() is not null then
    select pending_discount, first_order_used
      into v_pending, v_fou
      from profiles where id = auth.uid()
      for update;
  end if;
  if v_pending then
    v_authorized := round(p_subtotal * 0.30);
  elsif not v_fou then
    v_authorized := round(p_subtotal * 0.10);
  else
    v_authorized := 0;
  end if;

  if p_discount > v_authorized or p_discount > p_subtotal then
    raise exception 'discount not authorized';
  end if;
  if p_total <> p_subtotal + p_delivery - p_discount then
    raise exception 'total mismatch';
  end if;

  insert into public.orders(
    id, status, processing_ends_at, customer, items,
    subtotal, discount, discount_label, delivery, total, account_email
  ) values (
    p_id, 'processing', p_processing_ends_at, p_customer, p_items,
    p_subtotal, p_discount, p_discount_label, p_delivery, p_total, p_account_email
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
