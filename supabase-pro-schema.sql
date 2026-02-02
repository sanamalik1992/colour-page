-- ============================================
-- PRO SUBSCRIPTION SYSTEM SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. STRIPE CUSTOMERS TABLE
-- Stores customer info and Pro status
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  is_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_pro column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stripe_customers' AND column_name = 'is_pro') THEN
    ALTER TABLE stripe_customers ADD COLUMN is_pro BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. STRIPE SUBSCRIPTIONS TABLE
-- Stores subscription details
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  plan_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. STRIPE PAYMENTS TABLE (for one-time payments if needed)
CREATE TABLE IF NOT EXISTS stripe_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'gbp',
  status TEXT NOT NULL,
  job_id UUID,
  email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. WEBHOOK EVENTS TABLE (for idempotency)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_stripe_customers_email ON stripe_customers(email);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_is_pro ON stripe_customers(is_pro) WHERE is_pro = true;
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer ON stripe_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON stripe_subscriptions(status);

-- 6. ENABLE ROW LEVEL SECURITY (optional but recommended)
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for webhooks)
CREATE POLICY "Service role full access to stripe_customers" ON stripe_customers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to stripe_subscriptions" ON stripe_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to stripe_payments" ON stripe_payments
  FOR ALL USING (true) WITH CHECK (true);

-- 7. HELPER VIEW: Active Pro Users
CREATE OR REPLACE VIEW active_pro_users AS
SELECT 
  c.email,
  c.stripe_customer_id,
  c.is_pro,
  s.status as subscription_status,
  s.current_period_end,
  s.cancel_at_period_end
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.stripe_customer_id = s.stripe_customer_id
WHERE c.is_pro = true
  AND (s.status IN ('active', 'trialing') OR s.status IS NULL);

-- 8. FUNCTION: Check if user is Pro
CREATE OR REPLACE FUNCTION is_user_pro(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM stripe_customers 
    WHERE email = LOWER(user_email) 
    AND is_pro = true
  );
END;
$$ LANGUAGE plpgsql;

-- Print success message
DO $$ BEGIN RAISE NOTICE 'Pro subscription schema created successfully!'; END $$;
