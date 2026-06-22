create extension if not exists pgcrypto;

-- Multi-tenant platform tables
create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  currency text not null default 'PKR',
  delivery_fee_cents integer not null default 15000,
  payment jsonb not null default '{}',
  tracking_messages jsonb not null default '{}',
  status text not null default 'trial' check (status in ('trial', 'active', 'suspended')),
  plan text not null default 'trial' check (plan in ('trial', 'starter', 'pro')),
  twilio_mode text not null default 'platform' check (twilio_mode in ('platform', 'byo')),
  twilio_account_sid text,
  twilio_auth_token_encrypted text,
  twilio_whatsapp_from text unique,
  central_twilio_whatsapp_from text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists restaurant_members (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'counter', 'kitchen')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

create index if not exists restaurant_members_user_id_idx on restaurant_members(user_id);
create index if not exists restaurants_twilio_from_idx on restaurants(twilio_whatsapp_from);

insert into restaurants (
  id,
  slug,
  name,
  tagline,
  currency,
  delivery_fee_cents,
  payment,
  tracking_messages,
  status,
  plan,
  twilio_mode,
  twilio_whatsapp_from
) values (
  '00000000-0000-0000-0000-000000000001',
  'brew-bite',
  'Brew & Bite Cafe',
  'Coffee, snacks, and comfort food on WhatsApp',
  'PKR',
  15000,
  '{"accountTitle":"Brew & Bite Cafe","bankName":"Example Bank","accountNumber":"01234567890123","iban":"PK00EXMP0001234567890123","instructions":"Transfer the exact total and send a screenshot of the payment confirmation here."}'::jsonb,
  '{"confirmed":"Your order is confirmed and heading to the kitchen.","in_kitchen":"Our kitchen is preparing your order now.","ready":"Your order is ready!","out_for_delivery":"Your order is on the way.","completed":"Order delivered. Thank you for ordering with us!","payment_rejected":"We could not verify your payment. Please send a clear screenshot or contact the counter.","order_updated":"Your order was updated. Please review the new total and payment details if needed.","order_cancelled":"Your order has been cancelled."}'::jsonb,
  'active',
  'starter',
  'platform',
  'whatsapp:+14155238886'
)
on conflict (id) do nothing;

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  slug text not null,
  name text not null,
  city text not null default '',
  address text not null default '',
  delivery_fee_cents integer,
  payment jsonb,
  twilio_whatsapp_from text unique,
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, slug)
);

create index if not exists branches_restaurant_id_idx on branches(restaurant_id);
create index if not exists branches_twilio_from_idx on branches(twilio_whatsapp_from);

insert into branches (
  id,
  restaurant_id,
  slug,
  name,
  city,
  delivery_fee_cents,
  twilio_whatsapp_from,
  is_default,
  active
) values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'main',
  'Brew & Bite Main',
  'Lahore',
  15000,
  'whatsapp:+14155238886',
  true,
  true
)
on conflict (id) do nothing;

create table if not exists branch_menu_items (
  branch_id uuid not null references branches(id) on delete cascade,
  id text not null,
  category_id text not null,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents > 0),
  available boolean not null default true,
  prep_minutes integer not null default 10,
  option_groups jsonb not null default '[]',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (branch_id, id)
);

create table if not exists branch_menu_overrides (
  branch_id uuid not null references branches(id) on delete cascade,
  menu_item_id text not null,
  available boolean,
  price_cents integer,
  name text,
  description text,
  primary key (branch_id, menu_item_id)
);

create table if not exists branch_order_number_seq (
  branch_id uuid primary key references branches(id) on delete cascade,
  next_order_number integer not null default 1006
);

insert into branch_order_number_seq (branch_id, next_order_number)
values ('00000000-0000-0000-0000-000000000002', 1006)
on conflict (branch_id) do nothing;

create table if not exists branch_members (
  branch_id uuid not null references branches(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'counter', 'kitchen')),
  created_at timestamptz not null default now(),
  primary key (branch_id, user_id)
);

-- Tenant-scoped operational tables
create table if not exists customers (
  id text not null,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  phone text not null,
  name text,
  default_address text,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, id),
  unique (restaurant_id, phone)
);

create table if not exists menu_categories (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  id text not null,
  name text not null,
  sort_order integer not null default 0,
  primary key (restaurant_id, id)
);

create table if not exists menu_items (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  id text not null,
  category_id text not null,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents > 0),
  available boolean not null default true,
  prep_minutes integer not null default 10,
  option_groups jsonb not null default '[]',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (restaurant_id, id),
  foreign key (restaurant_id, category_id) references menu_categories(restaurant_id, id)
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  customer_phone text not null,
  step text not null default 'idle',
  active_category_id text,
  shown_item_ids text[] not null default '{}',
  context jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, branch_id, customer_phone)
);

create table if not exists carts (
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  customer_phone text not null,
  lines jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (restaurant_id, branch_id, customer_phone)
);

create table if not exists orders (
  id text primary key,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  order_number integer not null,
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
  updated_at timestamptz not null default now(),
  unique (branch_id, order_number)
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

create table if not exists restaurant_order_number_seq (
  restaurant_id uuid primary key references restaurants(id) on delete cascade,
  next_order_number integer not null default 1006
);

insert into restaurant_order_number_seq (restaurant_id, next_order_number)
values ('00000000-0000-0000-0000-000000000001', 1006)
on conflict (restaurant_id) do nothing;

create index if not exists customers_restaurant_id_idx on customers(restaurant_id);
create index if not exists menu_items_restaurant_id_idx on menu_items(restaurant_id);
create index if not exists orders_restaurant_id_idx on orders(restaurant_id);
create index if not exists orders_branch_id_idx on orders(branch_id);
create index if not exists orders_branch_status_idx on orders(branch_id, status);
create index if not exists orders_restaurant_status_idx on orders(restaurant_id, status);
create index if not exists orders_customer_phone_created_at_idx on orders(restaurant_id, customer_phone, created_at desc);
create index if not exists orders_payment_status_idx on orders(payment_status);
create index if not exists conversations_branch_id_idx on conversations(branch_id);
create index if not exists order_items_order_id_idx on order_items(order_id);
create index if not exists order_events_order_id_created_at_idx on order_events(order_id, created_at desc);
