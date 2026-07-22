-- ============================================================================
-- Admin analytics — two lightweight new tables + indexes.
-- Run in the Supabase SQL editor. Safe to re-run.
-- Reuses photo_jobs for volumes/success/failure/pro-vs-free; these tables only
-- add what photo_jobs can't: live presence, and ALL typed topics (incl. blocked).
-- ============================================================================

-- Live presence: one row per anonymous browser session, refreshed by a
-- heartbeat. No personal data — just a session id, a timestamp, and a coarse
-- activity hint. Old rows are pruned on write.
create table if not exists presence (
  session_id text primary key,
  last_seen timestamptz not null default now(),
  activity text
);
create index if not exists presence_last_seen_idx on presence (last_seen);

-- Every learning topic a user submits — including ones later blocked or that
-- fail — so the admin sees true demand. Aggregate counts only, no identity.
create table if not exists topic_searches (
  term text primary key,
  count integer not null default 1,
  last_at timestamptz not null default now()
);
create index if not exists topic_searches_count_idx on topic_searches (count desc);
create index if not exists topic_searches_last_at_idx on topic_searches (last_at desc);

-- Atomic upsert-increment for a submitted topic (called fire-and-forget).
create or replace function track_topic(p_term text)
returns void language plpgsql as $$
begin
  insert into topic_searches (term, count, last_at)
  values (lower(trim(p_term)), 1, now())
  on conflict (term) do update
    set count = topic_searches.count + 1, last_at = now();
end;
$$;

-- Keep the analytics reads snappy.
create index if not exists photo_jobs_created_at_idx on photo_jobs (created_at desc);
create index if not exists photo_jobs_status_idx on photo_jobs (status);
