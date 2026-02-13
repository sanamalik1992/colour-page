-- ============================================
-- V2 MIGRATION: Usage Counters + Dot Jobs + Search
-- Run AFTER supabase-upgrade-migration.sql
-- ============================================

-- ============================================
-- 1. USAGE_COUNTERS TABLE (server-side rate limiting)
-- ============================================
CREATE TABLE IF NOT EXISTS usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,          -- session_id or email
  feature_key TEXT NOT NULL,      -- 'dot_to_dot', 'photo_coloring', etc.
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_key, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_user ON usage_counters(user_id, feature_key, date);

ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to usage_counters" ON usage_counters
  FOR ALL USING (true) WITH CHECK (true);

-- Atomic increment function
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id TEXT,
  p_feature_key TEXT,
  p_max_count INTEGER DEFAULT NULL
)
RETURNS TABLE(new_count INTEGER, allowed BOOLEAN) AS $$
DECLARE
  current INTEGER;
BEGIN
  INSERT INTO usage_counters (user_id, feature_key, date, count)
  VALUES (p_user_id, p_feature_key, CURRENT_DATE, 1)
  ON CONFLICT (user_id, feature_key, date)
  DO UPDATE SET count = usage_counters.count + 1, updated_at = NOW()
  RETURNING usage_counters.count INTO current;

  new_count := current;
  allowed := (p_max_count IS NULL OR current <= p_max_count);
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Lifetime usage count (for features like "1 free ever")
CREATE OR REPLACE FUNCTION get_lifetime_usage(
  p_user_id TEXT,
  p_feature_key TEXT
)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(count)::INTEGER FROM usage_counters
     WHERE user_id = p_user_id AND feature_key = p_feature_key),
    0
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 2. DOT_JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS dot_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'rendering', 'done', 'failed')),

  -- Input
  input_storage_path TEXT NOT NULL,
  original_filename TEXT,

  -- Output
  output_pdf_path TEXT,
  output_png_path TEXT,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,
  -- settings shape: {
  --   dotCount: 50 | 100 | 150 | 200,
  --   showGuideLines: boolean,
  --   difficulty: 'easy' | 'medium' | 'hard'
  -- }

  -- Processing
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  error TEXT,

  -- Tier info
  is_pro BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_dot_jobs_user_id ON dot_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_dot_jobs_status ON dot_jobs(status);
CREATE INDEX IF NOT EXISTS idx_dot_jobs_pending ON dot_jobs(status, created_at)
  WHERE status IN ('queued', 'processing');

ALTER TABLE dot_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to dot_jobs" ON dot_jobs
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER dot_jobs_updated_at
  BEFORE UPDATE ON dot_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 3. SEARCH_TERMS TABLE (typeahead + popular searches)
-- ============================================
CREATE TABLE IF NOT EXISTS search_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT UNIQUE NOT NULL,
  count INTEGER DEFAULT 1,
  is_suggested BOOLEAN DEFAULT false,  -- curated suggestion
  category TEXT,                        -- optional category link
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_terms_count ON search_terms(count DESC);
CREATE INDEX IF NOT EXISTS idx_search_terms_suggested ON search_terms(is_suggested) WHERE is_suggested = true;

ALTER TABLE search_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to search_terms" ON search_terms
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read search_terms" ON search_terms
  FOR SELECT USING (true);

-- Increment search count (upsert)
CREATE OR REPLACE FUNCTION track_search(p_term TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO search_terms (term, count)
  VALUES (LOWER(TRIM(p_term)), 1)
  ON CONFLICT (term)
  DO UPDATE SET count = search_terms.count + 1, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Seed curated search suggestions
INSERT INTO search_terms (term, is_suggested, category) VALUES
  ('cute animals', true, 'Animals'),
  ('dinosaurs', true, 'Dinosaurs'),
  ('unicorn', true, 'Fantasy'),
  ('mermaid', true, 'Fantasy'),
  ('dragon', true, 'Fantasy'),
  ('space rockets', true, 'Space'),
  ('ocean creatures', true, 'Ocean'),
  ('butterflies', true, 'Nature'),
  ('flowers garden', true, 'Nature'),
  ('racing cars', true, 'Vehicles'),
  ('football', true, 'Sports'),
  ('princess castle', true, 'Fantasy'),
  ('pirate ship', true, 'Vehicles'),
  ('jungle animals', true, 'Animals'),
  ('robots', true, 'Fantasy'),
  ('ice cream treats', true, 'Food'),
  ('farm animals', true, 'Animals'),
  ('underwater world', true, 'Ocean'),
  ('superhero city', true, 'Fantasy'),
  ('ramadan lanterns', true, NULL),
  ('eid celebration', true, NULL),
  ('christmas tree', true, NULL),
  ('halloween pumpkins', true, NULL),
  ('easter eggs', true, NULL),
  ('diwali rangoli', true, NULL),
  ('spring flowers', true, NULL),
  ('summer beach', true, NULL),
  ('autumn leaves', true, NULL),
  ('winter snowman', true, NULL)
ON CONFLICT (term) DO NOTHING;


-- ============================================
-- 4. PRINT SUCCESS
-- ============================================
DO $$ BEGIN RAISE NOTICE 'V2 migration completed successfully!'; END $$;
