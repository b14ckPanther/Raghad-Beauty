-- Raghad Beauty: core schema.
-- Everything the customer sees is a row here and is edited from the admin portal.

create schema if not exists private;

create table private.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.admin_users where user_id = (select auth.uid())
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin();
$$;

revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated, service_role;

-- Single documents: settings, hero, copy, footer, labels.
create table public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.brands (
  id text primary key,
  name text not null default '',
  name_ar text not null default '',
  origin text not null default '',
  visible boolean not null default true,
  sort_order integer not null default 0
);

create table public.categories (
  id text primary key,
  name text not null default '',
  visible boolean not null default true,
  sort_order integer not null default 0
);

create table public.needs (
  id text primary key,
  name text not null default '',
  icon text not null default 'drop',
  sort_order integer not null default 0
);

create table public.hair_types (
  id text primary key,
  name text not null default '',
  curl numeric not null default 0.5 check (curl >= 0 and curl <= 1),
  sort_order integer not null default 0
);

create table public.products (
  id text primary key,
  brand text references public.brands (id) on update cascade on delete set null,
  category text references public.categories (id) on update cascade on delete set null,
  line text not null default '',
  name text not null default '',
  name_ar text not null default '',
  summary text not null default '',
  benefits text[] not null default '{}',
  actives text not null default '',
  need text[] not null default '{}',
  hair text[] not null default '{}',
  texture text not null default '',
  usage text[] not null default '{}',
  size text not null default '',
  price numeric check (price is null or price >= 0),
  compare_at numeric check (compare_at is null or compare_at >= 0),
  img text not null default '',
  thumb text not null default '',
  bg text not null default '#e9c4d6',
  r1 text not null default '#b4125f',
  r2 text not null default '#f2a12a',
  available boolean not null default true,
  visible boolean not null default true,
  featured boolean not null default false,
  family boolean not null default false,
  source_note text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on column public.products.price is 'Null means not priced yet: the product is shown but cannot be ordered.';

create table public.coupons (
  id text primary key,
  code text not null unique,
  type text not null default 'percent' check (type in ('percent', 'fixed')),
  value numeric not null default 0 check (value >= 0),
  min numeric not null default 0 check (min >= 0),
  expires date,
  active boolean not null default true,
  label text not null default '',
  sort_order integer not null default 0
);

create table public.regions (
  id text primary key,
  name text not null default '',
  fee numeric not null default 0 check (fee >= 0),
  eta text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.payments (
  id text primary key,
  name text not null default '',
  number text not null default '',
  note text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0
);

create table public.promos (
  id text primary key,
  text text not null default '',
  code text not null default '',
  visible boolean not null default true,
  sort_order integer not null default 0
);

create table public.usage_guide (
  id text primary key,
  title text not null default '',
  text text not null default '',
  sort_order integer not null default 0
);

create table public.sections (
  id text primary key,
  title text not null default '',
  visible boolean not null default true,
  sort_order integer not null default 0
);

create table public.socials (
  id text primary key,
  platform text not null default 'link',
  label text not null default '',
  url text not null default '',
  visible boolean not null default true,
  sort_order integer not null default 0
);

create table public.nav_links (
  id text primary key,
  label text not null default '',
  target text not null default '',
  visible boolean not null default true,
  sort_order integer not null default 0
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  product text references public.products (id) on update cascade on delete set null,
  rating integer not null check (rating between 1 and 5),
  text text not null check (char_length(text) between 10 and 600),
  photos text[] not null default '{}' check (coalesce(array_length(photos, 1), 0) <= 3),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now()
);

create index reviews_status_created_idx on public.reviews (status, created_at desc);
create index products_sort_idx on public.products (sort_order);

-- Row level security: the public reads, only admins write.
do $$
declare
  t text;
begin
  foreach t in array array[
    'site_content', 'brands', 'categories', 'needs', 'hair_types', 'regions',
    'payments', 'promos', 'usage_guide', 'sections', 'socials', 'nav_links'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

alter table public.products enable row level security;
create policy "public read visible" on public.products for select to anon, authenticated
  using (visible or (select private.is_admin()));
create policy "admin write" on public.products for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- Coupon codes are private: customers validate a code through check_coupon().
alter table public.coupons enable row level security;
create policy "admin all" on public.coupons for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
revoke all on public.coupons from anon;
grant select, insert, update, delete on public.coupons to authenticated;

create or replace function public.check_coupon(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.coupons%rowtype;
begin
  select * into c from public.coupons
  where upper(code) = upper(trim(p_code)) and active
  limit 1;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if c.expires is not null and c.expires < current_date then
    return jsonb_build_object('status', 'expired');
  end if;

  return jsonb_build_object(
    'status', 'ok', 'code', c.code, 'type', c.type, 'value', c.value, 'min', c.min
  );
end;
$$;

revoke all on function public.check_coupon(text) from public;
grant execute on function public.check_coupon(text) to anon, authenticated;

-- Reviews: anyone may submit, nothing is public until an admin approves it.
alter table public.reviews enable row level security;
create policy "public read approved" on public.reviews for select to anon, authenticated
  using (status = 'approved' or (select private.is_admin()));
create policy "anyone can submit pending" on public.reviews for insert to anon, authenticated
  with check (status = 'pending');
create policy "admin update" on public.reviews for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin delete" on public.reviews for delete to authenticated
  using ((select private.is_admin()));
grant select, insert on public.reviews to anon, authenticated;
grant update, delete on public.reviews to authenticated;
