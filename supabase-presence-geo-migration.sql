-- Adds a coarse country code to the live presence table so the admin dashboard
-- can show "where visitors are from" (ISO-3166 alpha-2, e.g. GB, US). No IP or
-- personal data is stored — only the country code, and only for ~5 minutes
-- (presence rows are pruned). Safe to run more than once.
alter table if exists public.presence
  add column if not exists country text;
