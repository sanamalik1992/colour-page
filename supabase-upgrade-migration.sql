-- ============================================
-- UPGRADE MIGRATION: Photo Jobs + Print Pages + Admin
-- Run this in Supabase SQL Editor after existing schemas
-- ============================================

-- ============================================
-- 1. PHOTO_JOBS TABLE (enhanced job tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS photo_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT, -- session_id or email
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
  --   orientation: 'portrait' | 'landscape',
  --   lineThickness: 'thin' | 'medium' | 'thick',
  --   detailLevel: 'low' | 'medium' | 'high',
  --   complexity: 'simple' | 'medium' | 'detailed'
  -- }

  -- Processing
  prediction_id TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  error TEXT,

  -- Tier info
  is_pro BOOLEAN DEFAULT false,
  is_watermarked BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for photo_jobs
CREATE INDEX IF NOT EXISTS idx_photo_jobs_user_id ON photo_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_status ON photo_jobs(status);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_created ON photo_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_pending ON photo_jobs(status, created_at)
  WHERE status IN ('queued', 'processing');

-- RLS for photo_jobs
ALTER TABLE photo_jobs ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to photo_jobs" ON photo_jobs
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER photo_jobs_updated_at
  BEFORE UPDATE ON photo_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 2. PRINT_PAGES TABLE (curated colouring sheets)
-- ============================================
CREATE TABLE IF NOT EXISTS print_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,

  -- Categorisation
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  season TEXT, -- 'ramadan', 'eid', 'winter', 'spring', 'summer', 'autumn', 'christmas', 'halloween', etc.
  age_range TEXT DEFAULT '3-12',

  -- Files
  source_storage_path TEXT, -- original SVG/PNG upload
  pdf_storage_path TEXT,    -- generated A4 PDF
  preview_png_path TEXT,    -- web preview

  -- Display
  featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  -- Stats
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for print_pages
CREATE INDEX IF NOT EXISTS idx_print_pages_category ON print_pages(category);
CREATE INDEX IF NOT EXISTS idx_print_pages_season ON print_pages(season) WHERE season IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_print_pages_featured ON print_pages(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_print_pages_published ON print_pages(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_pages_slug ON print_pages(slug);
CREATE INDEX IF NOT EXISTS idx_print_pages_tags ON print_pages USING gin(tags);

-- RLS for print_pages
ALTER TABLE print_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Public read published print_pages" ON print_pages
  FOR SELECT USING (is_published = true);

-- Service role has full access
CREATE POLICY "Service role full access to print_pages" ON print_pages
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER print_pages_updated_at
  BEFORE UPDATE ON print_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 3. PROFILES TABLE (admin flag)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to profiles" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 4. STORAGE BUCKETS (create via Supabase dashboard or API)
-- ============================================
-- Run these in Supabase SQL Editor:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('outputs', 'outputs', false) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('print-pages', 'print-pages', true) ON CONFLICT DO NOTHING;

-- Storage policies for uploads bucket
-- CREATE POLICY "Service role upload to uploads" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'uploads');
-- CREATE POLICY "Service role read uploads" ON storage.objects
--   FOR SELECT USING (bucket_id = 'uploads');

-- Storage policies for outputs bucket
-- CREATE POLICY "Service role manage outputs" ON storage.objects
--   FOR ALL USING (bucket_id = 'outputs') WITH CHECK (bucket_id = 'outputs');

-- Storage policies for print-pages bucket (public read)
-- CREATE POLICY "Public read print-pages" ON storage.objects
--   FOR SELECT USING (bucket_id = 'print-pages');
-- CREATE POLICY "Service role manage print-pages" ON storage.objects
--   FOR ALL USING (bucket_id = 'print-pages') WITH CHECK (bucket_id = 'print-pages');


-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE email = LOWER(user_email)
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to claim a queued job (compare-and-swap locking)
CREATE OR REPLACE FUNCTION claim_next_photo_job(max_age_minutes INTEGER DEFAULT 10)
RETURNS UUID AS $$
DECLARE
  job_id UUID;
BEGIN
  -- Find the oldest queued job, or a stale processing job
  SELECT id INTO job_id
  FROM photo_jobs
  WHERE status = 'queued'
    OR (status = 'processing' AND processing_started_at < NOW() - (max_age_minutes || ' minutes')::interval)
  ORDER BY
    CASE WHEN is_pro THEN 0 ELSE 1 END, -- Pro jobs first
    created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF job_id IS NOT NULL THEN
    UPDATE photo_jobs
    SET status = 'processing',
        processing_started_at = NOW(),
        updated_at = NOW()
    WHERE id = job_id;
  END IF;

  RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to count daily photo jobs for rate limiting
CREATE OR REPLACE FUNCTION count_daily_photo_jobs(session_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM photo_jobs
    WHERE user_id = session_id
    AND created_at >= CURRENT_DATE
    AND status IN ('queued', 'processing', 'rendering', 'done')
  );
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 6. PRINT SUCCESS
-- ============================================
DO $$ BEGIN RAISE NOTICE 'Upgrade migration completed successfully!'; END $$;
