create extension if not exists pgcrypto;

create table if not exists customers (
  id text primary key,
  phone text not null unique,
  name text,
  default_address text,
  created_at timestamptz not null default now()
);

create table if not exists menu_categories (
  id text primary key,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists menu_items (
  id text primary key,
  category_id text not null references menu_categories(id),
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents > 0),
  available boolean not null default true,
  prep_minutes integer not null default 10,
  option_groups jsonb not null default '[]',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  customer_phone text not null unique,
  step text not null default 'idle',
  active_category_id text,
  shown_item_ids text[] not null default '{}',
  context jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists carts (
  customer_phone text primary key,
  lines jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  order_number integer not null unique,
  customer_phone text not null,
  customer_name text,
  status text not null,
  payment_status text not null,
  fulfillment_type text not null check (fulfillment_type in ('delivery', 'takeaway')),
  delivery_address text,
  pickup_time text,
  subtotal_cents integer not null default 0,
  delivery_fee_cents integer not null default 0,
  total_cents integer not null default 0,
  notes text,
  payment_screenshot_url text,
  payment_verified_by text,
  payment_verified_at timestamptz,
  payment_rejection_reason text,
  kitchen_acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  menu_item_id text not null,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents > 0),
  selected_options jsonb not null default '[]',
  notes text
);

create table if not exists order_events (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists order_number_seq (
  id int primary key default 1,
  next_order_number int not null default 1006
);

insert into order_number_seq (id, next_order_number)
values (1, 1006)
on conflict (id) do nothing;

create index if not exists orders_customer_phone_created_at_idx on orders(customer_phone, created_at desc);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_payment_status_idx on orders(payment_status);
create index if not exists order_items_order_id_idx on order_items(order_id);
create index if not exists order_events_order_id_created_at_idx on order_events(order_id, created_at desc);
