-- ============================================
-- Gold Ornament Ledger — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Parties Table
CREATE TABLE IF NOT EXISTS parties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Unique party name per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_name_user 
  ON parties (LOWER(name), user_id);

-- 2. Ledger Entries Table
-- type: 'issue' = gold given to party, 'receive' = gold received from party, 'payment' = payment received
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'issue' CHECK (type IN ('issue', 'receive', 'payment')),
  party_name TEXT NOT NULL,
  quantity NUMERIC,  -- optional
  weight NUMERIC(10,3),
  touch NUMERIC(5,2),
  fine NUMERIC(10,3),
  amount NUMERIC(12,2),  -- for payment entries (in currency)
  notes TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries (date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_party ON ledger_entries (party_name);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_entries (type);

-- Auto-calculate fine on insert/update
CREATE OR REPLACE FUNCTION calculate_fine()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type IN ('issue', 'receive') AND NEW.weight IS NOT NULL AND NEW.touch IS NOT NULL THEN
    NEW.fine := ROUND((NEW.weight * NEW.touch / 100)::numeric, 3);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_calculate_fine
  BEFORE INSERT OR UPDATE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_fine();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- Parties policies
CREATE POLICY "Users can view own parties" ON parties
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own parties" ON parties
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own parties" ON parties
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own parties" ON parties
  FOR DELETE USING (auth.uid() = user_id);

-- Ledger entries policies
CREATE POLICY "Users can view own entries" ON ledger_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON ledger_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON ledger_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON ledger_entries
  FOR DELETE USING (auth.uid() = user_id);
