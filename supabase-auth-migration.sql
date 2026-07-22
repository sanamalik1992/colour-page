-- ============================================================================
-- Stage 1 auth migration — Supabase Auth linkage
-- Run this in the Supabase SQL editor (there is no supabase/migrations runner).
-- Safe to re-run (idempotent).
-- ============================================================================

-- 1. Link Stripe customers to an auth user. Email stays the primary match key
--    (the whole existing system is email-keyed); user_id makes the link robust
--    if a user ever changes their email, so Pro follows the ACCOUNT not the string.
alter table stripe_customers add column if not exists user_id uuid;
create index if not exists stripe_customers_user_id_idx on stripe_customers (user_id);

-- 2. profiles is keyed by the auth user id going forward. The table already
--    exists (id uuid pk, email unique, is_admin, display_name); we just make sure
--    it has updated_at and insert rows with id = auth.users.id via the trigger below.
alter table profiles add column if not exists updated_at timestamptz default now();

-- 3. Auto-create a profile row whenever a new auth user signs up (email/password
--    or Google). SECURITY DEFINER so it can write to public.profiles from the
--    auth schema trigger. On an email clash with a pre-existing (e.g. admin) row,
--    adopt the auth id so lookups by auth.uid() resolve.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (email) do update
    set id = excluded.id,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================================
-- Notes
--  • Enable providers in Supabase dashboard → Authentication → Providers:
--      - Email (email/password). For "sign up in seconds", you may turn OFF
--        "Confirm email" so accounts are usable immediately (trade-off: no
--        email verification). Leaving it ON shows a "check your inbox" step.
--      - Google: add OAuth client ID/secret and the redirect URL
--        https://<your-domain>/auth/callback
--  • RLS is NOT relied on for authorization in Stage 1 — routes use the
--    service_role key and filter by the SERVER-VERIFIED auth.uid()/email.
-- ============================================================================
