-- ============================================
-- TRENDING COLOURING PAGES SYSTEM SCHEMA
-- ============================================

-- Trending topics detected from external sources
CREATE TABLE IF NOT EXISTS trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_topic TEXT NOT NULL,
  safe_topic TEXT NOT NULL,
  source TEXT NOT NULL, -- 'google_trends', 'pinterest', 'reddit', 'seasonal'
  trend_score INTEGER DEFAULT 0,
  is_copyrighted BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Generated colouring pages
CREATE TABLE IF NOT EXISTS colouring_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  prompt_used TEXT NOT NULL,
  
  -- Categorisation
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  age_range TEXT DEFAULT '3-8',
  
  -- Files
  preview_path TEXT, -- PNG for web
  print_path TEXT,   -- PDF for printing
  
  -- Ranking
  trend_score INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  print_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  
  -- Status
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Linking
  topic_id UUID REFERENCES trending_topics(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily statistics for ranking
CREATE TABLE IF NOT EXISTS page_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES colouring_pages(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  prints INTEGER DEFAULT 0,
  UNIQUE(page_id, date)
);

-- Blocked terms (copyrighted/unsafe)
CREATE TABLE IF NOT EXISTS blocked_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT UNIQUE NOT NULL,
  reason TEXT, -- 'copyright', 'brand', 'inappropriate'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seasonal events calendar
CREATE TABLE IF NOT EXISTS seasonal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  safe_prompt TEXT NOT NULL,
  category TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  priority INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_colouring_pages_category ON colouring_pages(category);
CREATE INDEX IF NOT EXISTS idx_colouring_pages_slug ON colouring_pages(slug);
CREATE INDEX IF NOT EXISTS idx_colouring_pages_trend_score ON colouring_pages(trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_colouring_pages_published ON colouring_pages(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_approved ON trending_topics(is_approved, trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_page_stats_date ON page_stats(date, page_id);

-- Insert blocked terms (copyright protection)
INSERT INTO blocked_terms (term, reason) VALUES
  ('disney', 'copyright'),
  ('pixar', 'copyright'),
  ('marvel', 'copyright'),
  ('dc comics', 'copyright'),
  ('pokemon', 'copyright'),
  ('nintendo', 'copyright'),
  ('peppa pig', 'copyright'),
  ('paw patrol', 'copyright'),
  ('cocomelon', 'copyright'),
  ('bluey', 'copyright'),
  ('frozen', 'copyright'),
  ('spiderman', 'copyright'),
  ('spider-man', 'copyright'),
  ('batman', 'copyright'),
  ('superman', 'copyright'),
  ('hello kitty', 'copyright'),
  ('sanrio', 'copyright'),
  ('minecraft', 'copyright'),
  ('roblox', 'copyright'),
  ('fortnite', 'copyright'),
  ('sonic', 'copyright'),
  ('sega', 'copyright'),
  ('barbie', 'copyright'),
  ('lego', 'copyright'),
  ('thomas the tank', 'copyright'),
  ('sesame street', 'copyright'),
  ('nickelodeon', 'copyright'),
  ('cartoon network', 'copyright'),
  ('dreamworks', 'copyright'),
  ('illumination', 'copyright'),
  ('minions', 'copyright'),
  ('shrek', 'copyright'),
  ('taylor swift', 'brand'),
  ('beyonce', 'brand'),
  ('bts', 'brand'),
  ('blackpink', 'brand')
ON CONFLICT (term) DO NOTHING;

-- Insert seasonal events
INSERT INTO seasonal_events (name, safe_prompt, category, start_date, end_date, priority) VALUES
  ('Christmas', 'christmas tree with presents and decorations', 'Seasonal', '2025-12-01', '2025-12-31', 10),
  ('Halloween', 'friendly jack o lantern pumpkin with bats', 'Seasonal', '2025-10-15', '2025-10-31', 10),
  ('Easter', 'easter bunny with decorated eggs in basket', 'Seasonal', '2025-04-01', '2025-04-21', 10),
  ('Valentines Day', 'hearts and flowers love theme', 'Seasonal', '2025-02-07', '2025-02-14', 8),
  ('Spring', 'spring flowers butterflies and birds', 'Seasonal', '2025-03-01', '2025-05-31', 5),
  ('Summer', 'beach scene with sandcastle and sun', 'Seasonal', '2025-06-01', '2025-08-31', 5),
  ('Autumn', 'autumn leaves falling from trees', 'Seasonal', '2025-09-01', '2025-11-30', 5),
  ('Winter', 'snowman in winter wonderland scene', 'Seasonal', '2025-12-01', '2026-02-28', 5),
  ('Back to School', 'school supplies pencils books backpack', 'Seasonal', '2025-08-20', '2025-09-15', 7),
  ('Mothers Day', 'flowers and hearts for mum', 'Seasonal', '2025-03-25', '2025-03-30', 8),
  ('Fathers Day', 'tools and sports items for dad', 'Seasonal', '2025-06-10', '2025-06-15', 8),
  ('New Year', 'fireworks and celebration party', 'Seasonal', '2025-12-28', '2026-01-05', 8),
  ('Diwali', 'diya lamps and rangoli patterns', 'Cultural', '2025-10-20', '2025-11-05', 7),
  ('Chinese New Year', 'dragon and lanterns celebration', 'Cultural', '2025-01-25', '2025-02-10', 7),
  ('Eid', 'crescent moon and mosque silhouette', 'Cultural', '2025-03-28', '2025-04-05', 7),
  ('Hanukkah', 'menorah with candles', 'Cultural', '2025-12-14', '2025-12-22', 7)
ON CONFLICT DO NOTHING;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS colouring_pages_updated_at ON colouring_pages;
CREATE TRIGGER colouring_pages_updated_at
  BEFORE UPDATE ON colouring_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
