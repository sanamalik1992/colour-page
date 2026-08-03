-- ============================================================================
-- Enable Row Level Security (RLS) on every table in the public schema.
--
-- WHY: Supabase Advisor flags "RLS Disabled in Public" as CRITICAL. Without RLS,
-- any table in `public` is reachable by the `anon` role — i.e. anyone who has the
-- public anon key that ships in the site's JavaScript can read/write it directly
-- via the auto-generated REST API (e.g. GET /rest/v1/coloring_library?select=*).
--
-- WHY THIS IS SAFE FOR colour.page: every database read/write in the app goes
-- through server-side API routes using the SERVICE-ROLE key, which BYPASSES RLS.
-- The browser only uses Supabase for auth and signed-URL storage uploads (never
-- table reads), and the server SSR anon client is only used for auth.getUser().
-- So enabling RLS with NO permissive policies denies the public anon/authenticated
-- roles direct table access while leaving the whole application working unchanged.
--
-- With RLS enabled and no policy defined, the default is DENY for anon/authenticated
-- (service_role still bypasses). That is exactly what we want here.
--
-- Idempotent: safe to run more than once. ENABLE RLS on an already-protected
-- table is a no-op.
-- ============================================================================

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tablename);
    RAISE NOTICE 'RLS enabled on public.%', t.tablename;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Optional hardening (defence in depth): also revoke the blanket privileges the
-- anon/authenticated roles get by default, so the tables are locked even if a
-- policy is ever added by mistake. The service_role keeps full access. Commented
-- out by default because ENABLE RLS above already closes the Advisor finding —
-- uncomment only if you want the extra belt-and-braces.
-- ----------------------------------------------------------------------------
-- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- Verify afterwards: this should return ZERO rows (no public table left without
-- RLS). Run it on its own after the migration to confirm.
-- ----------------------------------------------------------------------------
-- SELECT tablename
-- FROM pg_tables
-- WHERE schemaname = 'public' AND NOT rowsecurity;
