-- Multi-tenant SaaS: restaurants, scoped data, auth tables

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

-- Default tenant for existing deployments
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
  coalesce(nullif(current_setting('app.twilio_whatsapp_from', true), ''), 'whatsapp:+14155238886')
)
on conflict (id) do nothing;

-- Add restaurant_id to tenant tables
alter table customers add column if not exists restaurant_id uuid references restaurants(id);
alter table menu_categories add column if not exists restaurant_id uuid references restaurants(id);
alter table menu_items add column if not exists restaurant_id uuid references restaurants(id);
alter table conversations add column if not exists restaurant_id uuid references restaurants(id);
alter table carts add column if not exists restaurant_id uuid references restaurants(id);
alter table orders add column if not exists restaurant_id uuid references restaurants(id);

update customers set restaurant_id = '00000000-0000-0000-0000-000000000001' where restaurant_id is null;
update menu_categories set restaurant_id = '00000000-0000-0000-0000-000000000001' where restaurant_id is null;
update menu_items set restaurant_id = '00000000-0000-0000-0000-000000000001' where restaurant_id is null;
update conversations set restaurant_id = '00000000-0000-0000-0000-000000000001' where restaurant_id is null;
update carts set restaurant_id = '00000000-0000-0000-0000-000000000001' where restaurant_id is null;
update orders set restaurant_id = '00000000-0000-0000-0000-000000000001' where restaurant_id is null;

alter table customers alter column restaurant_id set not null;
alter table menu_categories alter column restaurant_id set not null;
alter table menu_items alter column restaurant_id set not null;
alter table conversations alter column restaurant_id set not null;
alter table carts alter column restaurant_id set not null;
alter table orders alter column restaurant_id set not null;

-- Drop old global uniques / keys (drop dependent FKs before parent PKs)
alter table menu_items drop constraint if exists menu_items_category_id_fkey;
alter table customers drop constraint if exists customers_phone_key;
alter table conversations drop constraint if exists conversations_customer_phone_key;
alter table orders drop constraint if exists orders_order_number_key;
alter table menu_categories drop constraint if exists menu_categories_pkey;
alter table menu_items drop constraint if exists menu_items_pkey;
alter table carts drop constraint if exists carts_pkey;

-- Composite uniques / keys
alter table customers add constraint customers_restaurant_phone_key unique (restaurant_id, phone);
alter table conversations add constraint conversations_restaurant_phone_key unique (restaurant_id, customer_phone);
alter table orders add constraint orders_restaurant_order_number_key unique (restaurant_id, order_number);
alter table menu_categories add constraint menu_categories_pkey primary key (restaurant_id, id);
alter table menu_items add constraint menu_items_pkey primary key (restaurant_id, id);
alter table menu_items add constraint menu_items_category_fkey
  foreign key (restaurant_id, category_id) references menu_categories(restaurant_id, id);
alter table carts add constraint carts_pkey primary key (restaurant_id, customer_phone);

-- Per-restaurant order number sequence
create table if not exists restaurant_order_number_seq (
  restaurant_id uuid primary key references restaurants(id) on delete cascade,
  next_order_number integer not null default 1006
);

insert into restaurant_order_number_seq (restaurant_id, next_order_number)
select '00000000-0000-0000-0000-000000000001', coalesce((select next_order_number from order_number_seq where id = 1), 1006)
on conflict (restaurant_id) do nothing;

create index if not exists customers_restaurant_id_idx on customers(restaurant_id);
create index if not exists menu_items_restaurant_id_idx on menu_items(restaurant_id);
create index if not exists orders_restaurant_id_idx on orders(restaurant_id);
create index if not exists orders_restaurant_status_idx on orders(restaurant_id, status);
create index if not exists restaurants_twilio_from_idx on restaurants(twilio_whatsapp_from);
