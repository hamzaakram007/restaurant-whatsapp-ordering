-- Multi-branch: locations under each restaurant

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

-- Central brand WhatsApp number (optional branch picker flow)
alter table restaurants add column if not exists central_twilio_whatsapp_from text unique;

-- Branch-only menu items
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

-- Overrides on master menu items
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

create table if not exists branch_members (
  branch_id uuid not null references branches(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'counter', 'kitchen')),
  created_at timestamptz not null default now(),
  primary key (branch_id, user_id)
);

-- Default branch per restaurant from existing data
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
)
select
  case
    when r.id = '00000000-0000-0000-0000-000000000001'
    then '00000000-0000-0000-0000-000000000002'::uuid
    else gen_random_uuid()
  end,
  r.id,
  'main',
  r.name || ' Main',
  '',
  r.delivery_fee_cents,
  r.twilio_whatsapp_from,
  true,
  true
from restaurants r
where not exists (
  select 1 from branches b where b.restaurant_id = r.id and b.is_default = true
);

-- Add branch_id to operational tables
alter table conversations add column if not exists branch_id uuid references branches(id);
alter table carts add column if not exists branch_id uuid references branches(id);
alter table orders add column if not exists branch_id uuid references branches(id);

update conversations c
set branch_id = b.id
from branches b
where c.restaurant_id = b.restaurant_id and b.is_default = true and c.branch_id is null;

update carts c
set branch_id = b.id
from branches b
where c.restaurant_id = b.restaurant_id and b.is_default = true and c.branch_id is null;

update orders o
set branch_id = b.id
from branches b
where o.restaurant_id = b.restaurant_id and b.is_default = true and o.branch_id is null;

alter table conversations alter column branch_id set not null;
alter table carts alter column branch_id set not null;
alter table orders alter column branch_id set not null;

-- Replace uniques with branch-scoped keys
alter table conversations drop constraint if exists conversations_restaurant_phone_key;
alter table carts drop constraint if exists carts_pkey;

alter table conversations add constraint conversations_restaurant_branch_phone_key
  unique (restaurant_id, branch_id, customer_phone);
alter table carts add constraint carts_pkey primary key (restaurant_id, branch_id, customer_phone);

alter table orders drop constraint if exists orders_restaurant_order_number_key;
alter table orders add constraint orders_branch_order_number_key unique (branch_id, order_number);

-- Per-branch order sequences from restaurant seq
insert into branch_order_number_seq (branch_id, next_order_number)
select b.id, coalesce(
  (select rons.next_order_number from restaurant_order_number_seq rons where rons.restaurant_id = b.restaurant_id),
  1006
)
from branches b
where b.is_default = true
on conflict (branch_id) do nothing;

create index if not exists orders_branch_id_idx on orders(branch_id);
create index if not exists orders_branch_status_idx on orders(branch_id, status);
create index if not exists conversations_branch_id_idx on conversations(branch_id);
