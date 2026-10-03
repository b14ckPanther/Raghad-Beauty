-- Packages and special offers: sold as one item, added to the cart like a product.

create table public.packages (
  id text primary key,
  title text not null default '',
  description text not null default '',
  includes text[] not null default '{}',
  price numeric check (price is null or price >= 0),
  compare_at numeric check (compare_at is null or compare_at >= 0),
  ends date,
  img text not null default '',
  thumb text not null default '',
  bg text not null default '#e9c4d6',
  available boolean not null default true,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on column public.packages.ends is 'Optional last day of the offer; after it the offer is no longer shown.';

alter table public.packages enable row level security;
create policy "public read visible" on public.packages for select to anon, authenticated
  using (visible or (select private.is_admin()));
create policy "admin write" on public.packages for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
grant select on public.packages to anon, authenticated;
grant insert, update, delete on public.packages to authenticated;

-- The storefront section, placed right after the promo strip; shown or hidden from the admin.
update public.sections set sort_order = sort_order + 1 where sort_order >= 2;
insert into public.sections (id, title, visible, sort_order)
values ('offers', 'الباقات والعروض', true, 2)
on conflict (id) do nothing;

update public.site_content
set value = value || jsonb_build_object(
  'offersTitle', 'باقات وعروض خاصة',
  'offersText', 'عروض لفترة محدودة. أضيفي الباقة إلى السلة كما هي.'
)
where key = 'copy';
