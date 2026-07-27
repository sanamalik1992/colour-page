-- The deployed stripe_customers / stripe_subscriptions tables were missing the
-- timestamp columns the app expected, which made every is_pro write fail with
-- "could not find the 'updated_at' column ... in the schema cache" — so paying
-- customers never got Pro.
--
-- The app has since stopped writing these columns, so this is OPTIONAL — run it
-- only if you want created_at/updated_at bookkeeping back. Safe to run anytime.

alter table public.stripe_customers  add column if not exists created_at timestamptz default now();
alter table public.stripe_customers  add column if not exists updated_at timestamptz default now();

alter table public.stripe_subscriptions add column if not exists created_at timestamptz default now();
alter table public.stripe_subscriptions add column if not exists updated_at timestamptz default now();

-- Refresh PostgREST's schema cache so the new columns are visible immediately.
notify pgrst, 'reload schema';
