-- Physical product orders (portable printer, everything bundle).
-- Populated by the Stripe webhook on checkout.session.completed for one-off
-- (mode: payment) orders. Managed from the admin Orders page.
--
-- Run this in the Supabase SQL editor.

create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  stripe_session_id  text unique not null,          -- idempotency key
  product            text not null,                 -- 'portable-printer' | 'everything-bundle'
  product_name       text,
  quantity           integer not null default 1,
  amount_total       integer,                       -- in pence (Stripe minor units)
  currency           text not null default 'gbp',
  email              text,
  phone              text,
  ship_name          text,
  ship_address       jsonb,                         -- { line1, line2, city, state, postal_code, country }
  status             text not null default 'paid',  -- 'paid' | 'shipped'
  carrier            text,
  tracking_number    text,
  tracking_url       text,
  shipped_at         timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

-- Service-role only (the app reads/writes with the service key; no public access).
alter table public.orders enable row level security;
