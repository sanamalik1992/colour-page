-- Small key/value store for admin settings. Currently used to hold the
-- "checkout_since" baseline so the analytics Reset can also zero the Checkouts
-- panel (which is read live from Stripe and can't be deleted). Safe to re-run.
create table if not exists public.app_config (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
