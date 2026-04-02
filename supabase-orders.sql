create table if not exists public.orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  order_type text not null check (order_type in ('Pickup', 'Dine-in', 'Delivery')),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'UPI', 'Card')),
  delivery_address text,
  notes text,
  items jsonb not null,
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  estimated_distance_km numeric(6,2),
  archived_at timestamptz,
  source text not null default 'website',
  status text not null default 'new'
);

alter table public.orders
add column if not exists payment_method text not null default 'Cash';

alter table public.orders
add column if not exists archived_at timestamptz;

alter table public.orders enable row level security;

drop policy if exists "Allow public insert orders" on public.orders;
create policy "Allow public insert orders"
on public.orders
for insert
to anon
with check (true);

drop policy if exists "Allow authenticated read orders" on public.orders;
create policy "Allow authenticated read orders"
on public.orders
for select
to authenticated
using (true);

drop policy if exists "Allow authenticated update orders" on public.orders;
create policy "Allow authenticated update orders"
on public.orders
for update
to authenticated
using (true)
with check (true);
alter table if exists public.orders
add column if not exists delivery_fee_pending boolean not null default false;

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  business_name text not null,
  short_name text not null,
  email text not null,
  phone_display text not null,
  phone_href text not null,
  whatsapp_number text not null,
  address_line_1 text not null,
  address_line_2 text not null,
  footer_tagline text not null,
  map_query text not null,
  map_embed_url text not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  delivery_threshold_km integer not null default 15 check (delivery_threshold_km >= 0),
  long_distance_fee integer not null default 0 check (long_distance_fee >= 0),
  updated_at timestamptz not null default now()
);

insert into public.site_settings (
  id,
  business_name,
  short_name,
  email,
  phone_display,
  phone_href,
  whatsapp_number,
  address_line_1,
  address_line_2,
  footer_tagline,
  map_query,
  map_embed_url,
  latitude,
  longitude,
  delivery_threshold_km,
  long_distance_fee
)
values (
  1,
  'Green-Wood Cafe',
  'GW',
  'hello@greenwoodcafe.com',
  '+91 98765 43210',
  '+919876543210',
  '919871546439',
  'Plot No. 2, Pocket-6, Sector-A/10',
  'Sector A10, Narela, Delhi, 110040',
  'Your daily dose of comfort, one cup at a time.',
  'Plot No. 2, Pocket-6, Sector-A/10, Sector A10, Narela, Delhi, 110040',
  'https://www.google.com/maps?q=Plot%20No.%202%2C%20Pocket-6%2C%20Sector-A%2F10%2C%20Sector%20A10%2C%20Narela%2C%20Delhi%2C%20110040&z=15&output=embed',
  28.7958763,
  77.0984051,
  15,
  150
)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Allow public read site settings" on public.site_settings;
create policy "Allow public read site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Allow authenticated update site settings" on public.site_settings;
create policy "Allow authenticated update site settings"
on public.site_settings
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Allow authenticated insert site settings" on public.site_settings;
create policy "Allow authenticated insert site settings"
on public.site_settings
for insert
to authenticated
with check (true);

create table if not exists public.menu_items (
  id bigint generated always as identity primary key,
  section_key text not null check (
    section_key in ('showcase', 'drinks', 'burgers', 'pizza', 'pasta', 'continental', 'desserts')
  ),
  category text not null,
  name text not null,
  description text not null,
  price integer not null check (price >= 0),
  image_url text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_items enable row level security;

drop policy if exists "Allow public read menu items" on public.menu_items;
create policy "Allow public read menu items"
on public.menu_items
for select
to anon, authenticated
using (true);

drop policy if exists "Allow authenticated insert menu items" on public.menu_items;
create policy "Allow authenticated insert menu items"
on public.menu_items
for insert
to authenticated
with check (true);

drop policy if exists "Allow authenticated update menu items" on public.menu_items;
create policy "Allow authenticated update menu items"
on public.menu_items
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Allow authenticated delete menu items" on public.menu_items;
create policy "Allow authenticated delete menu items"
on public.menu_items
for delete
to authenticated
using (true);
