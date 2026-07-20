-- ============================================
-- TOPIC-BASED GENERATION ("What are they learning today?")
-- ============================================
-- Adds a text-topic generation path that reuses the existing photo_jobs
-- pipeline (process route, PDF renderer, dot-to-dot, status, watermarking).
-- A `source` discriminator tells the pipeline whether the line art comes
-- from an uploaded photo or a typed topic.
--
-- Run this once against the Supabase project before deploying the feature.

-- Discriminator: 'photo' (existing) or 'topic' (new). Existing rows default
-- to 'photo' so nothing changes for the current flow.
ALTER TABLE photo_jobs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'photo';

-- The raw text the parent typed (e.g. "letter B", "numbers to 10"). Kept for
-- auditing and for tuning the prompt builder.
ALTER TABLE photo_jobs ADD COLUMN IF NOT EXISTS topic TEXT;

-- Topic jobs have no uploaded file, so the input path is no longer required.
ALTER TABLE photo_jobs ALTER COLUMN input_storage_path DROP NOT NULL;

-- Filter/analytics by source.
CREATE INDEX IF NOT EXISTS idx_photo_jobs_source ON photo_jobs(source);
