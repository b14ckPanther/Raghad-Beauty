-- Quantity deals applied automatically in the cart, for example "buy 3, get 1 free".

create table public.deals (
  id text primary key,
  title text not null default '',
  description text not null default '',
  type text not null default 'bxgy' check (type in ('bxgy', 'percent')),
  buy_qty integer not null default 3 check (buy_qty >= 1),
  free_qty integer not null default 1 check (free_qty >= 0),
  percent numeric not null default 0 check (percent >= 0 and percent <= 100),
  products text[] not null default '{}',
  ends date,
  active boolean not null default true,
  sort_order integer not null default 0
);

comment on column public.deals.type is 'bxgy: buy buy_qty, get free_qty free (cheapest items). percent: percent off when buy_qty or more eligible items are in the cart.';
comment on column public.deals.products is 'Product ids the deal applies to; empty means every product.';

alter table public.deals enable row level security;
create policy "public read active" on public.deals for select to anon, authenticated
  using (active or (select private.is_admin()));
create policy "admin write" on public.deals for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
grant select on public.deals to anon, authenticated;
grant insert, update, delete on public.deals to authenticated;
