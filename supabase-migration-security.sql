-- ════════════════════════════════════════════════════════════
-- NOVU PEPTIDES — security hardening migration
-- Run this ONCE on an EXISTING database that was created with an earlier
-- version of supabase-setup.sql. It is idempotent: safe to run more than once.
--
-- What it does:
--   * apply_referral  → adds idempotency guards (no unlimited discount re-arming)
--   * place_order     → new atomic RPC (closes the discount double-spend race)
--   * orders INSERT   → enforces exact total + an authorized discount cap
--   * orders UPDATE   → pins PII/items/money so a compromised mod can't rewrite them
--   * CHECK constraints → status whitelist + per-item qty 1..99 (blocks qty XSS)
--   * Realtime        → REPLICA IDENTITY FULL so RLS applies to change broadcasts
-- ════════════════════════════════════════════════════════════

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
      (elem->>'qty')   ~ '^[0-9]+$' and (elem->>'qty')::int between 1 and 99
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

-- ── atomic place_order RPC ──
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
  if p_subtotal <> public.items_subtotal(p_items) then
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
