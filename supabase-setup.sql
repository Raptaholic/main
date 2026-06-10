-- ════════════════════════════════════════════════════════════
-- NOVU PEPTIDES - Supabase backend setup
-- Run this once in your Supabase project: SQL Editor > New query
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

create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- ── 2. REFERRALS ──
-- Called by a newly signed-up user with the code they entered.
-- Gives the code owner a pending 30% discount.
create or replace function public.apply_referral(code text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare ref_email text;
begin
  select email into ref_email
  from profiles
  where ref_code = upper(code) and role <> 'moderator' and id <> auth.uid()
  limit 1;
  if ref_email is null then return false; end if;
  update profiles set pending_discount = true where email = ref_email;
  update profiles set referred_by = ref_email where id = auth.uid();
  return true;
end;
$$;

-- ── 3. ORDERS ──
create table public.orders (
  id text primary key,
  created_at timestamptz not null default now(),
  status text not null default 'processing',
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

alter table public.orders enable row level security;

-- Guests and members can place orders
create policy "anyone can place orders"
  on public.orders for insert
  with check (true);

-- Customers see their own orders; moderators see everything
create policy "read own orders or moderator reads all"
  on public.orders for select
  using (account_email = auth.jwt()->>'email' or public.is_moderator(auth.uid()));

-- Only moderators can confirm / cancel / deliver
create policy "moderators update orders"
  on public.orders for update
  using (public.is_moderator(auth.uid()));

-- ── 4. LIVE DASHBOARD UPDATES ──
alter publication supabase_realtime add table public.orders;

-- ════════════════════════════════════════════════════════════
-- 5. PROMOTE MODERATORS - run AFTER Tom and John have created
--    their accounts on the website (use their REAL emails):
--
-- update public.profiles
--   set role = 'moderator', first_order_used = true
--   where email in ('tom@novupeptides.com', 'john@novupeptides.com');
-- ════════════════════════════════════════════════════════════
