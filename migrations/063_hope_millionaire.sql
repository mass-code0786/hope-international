DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'hope_millionaire_purchase';
    ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'hope_millionaire_member_income';
    ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'hope_millionaire_upline_income';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS hope_millionaire_package_states (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_amount NUMERIC(14,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  has_purchased BOOLEAN NOT NULL DEFAULT FALSE,
  period_earnings NUMERIC(14,2) NOT NULL DEFAULT 0,
  lifetime_earnings NUMERIC(14,2) NOT NULL DEFAULT 0,
  inactive_at TIMESTAMPTZ,
  reactivated_at TIMESTAMPTZ,
  last_purchase_at TIMESTAMPTZ,
  reactivation_reason VARCHAR(40),
  reactivation_referral_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, package_amount),
  CHECK (package_amount IN (3, 10, 25)),
  CHECK (period_earnings >= 0),
  CHECK (lifetime_earnings >= 0)
);

CREATE TABLE IF NOT EXISTS hope_millionaire_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_amount NUMERIC(14,2) NOT NULL,
  entry_source VARCHAR(30) NOT NULL,
  parent_entry_id UUID REFERENCES hope_millionaire_entries(id) ON DELETE SET NULL,
  slot_position SMALLINT,
  filled_slots SMALLINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  request_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK (package_amount IN (3, 10, 25)),
  CHECK (entry_source IN ('purchase', 'automatic_reentry')),
  CHECK (slot_position IS NULL OR slot_position BETWEEN 1 AND 3),
  CHECK (filled_slots BETWEEN 0 AND 3),
  CHECK (status IN ('open', 'completed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hope_millionaire_parent_slot
  ON hope_millionaire_entries(parent_entry_id, slot_position)
  WHERE parent_entry_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hope_millionaire_purchase_request
  ON hope_millionaire_entries(user_id, request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hope_millionaire_open_queue
  ON hope_millionaire_entries(package_amount, created_at, id)
  WHERE status = 'open' AND filled_slots < 3;

CREATE INDEX IF NOT EXISTS idx_hope_millionaire_user_package
  ON hope_millionaire_entries(user_id, package_amount, created_at DESC);

CREATE TABLE IF NOT EXISTS hope_millionaire_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES hope_millionaire_entries(id) ON DELETE SET NULL,
  package_amount NUMERIC(14,2) NOT NULL,
  transaction_type VARCHAR(30) NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  source_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  upline_level SMALLINT,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  event_key VARCHAR(180) NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (package_amount IN (3, 10, 25)),
  CHECK (transaction_type IN ('purchase', 'member_income', 'upline_income', 'automatic_reentry')),
  CHECK (amount >= 0),
  CHECK (upline_level IS NULL OR upline_level BETWEEN 1 AND 4)
);

CREATE INDEX IF NOT EXISTS idx_hope_millionaire_transactions_user
  ON hope_millionaire_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hope_millionaire_transactions_entry
  ON hope_millionaire_transactions(entry_id, created_at ASC);
