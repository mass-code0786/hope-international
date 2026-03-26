DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seller_earning_status') THEN
    CREATE TYPE seller_earning_status AS ENUM ('pending', 'eligible', 'paid', 'held', 'reversed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seller_payout_status') THEN
    CREATE TYPE seller_payout_status AS ENUM ('pending', 'processing', 'processed', 'failed', 'cancelled');
  END IF;
END $$;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category VARCHAR(120) NOT NULL DEFAULT 'General';

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

ALTER TABLE seller_documents
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120),
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  ADD COLUMN IF NOT EXISTS uploaded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_seller_documents_deleted_at ON seller_documents(deleted_at);

CREATE TABLE IF NOT EXISTS seller_earnings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_profile_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  seller_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID NULL REFERENCES order_items(id) ON DELETE SET NULL,
  source_type VARCHAR(80) NOT NULL DEFAULT 'order_sale',
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  net_earning_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (net_earning_amount >= 0),
  bv NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (bv >= 0),
  pv NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (pv >= 0),
  earning_status seller_earning_status NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_earnings_profile ON seller_earnings_ledger(seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_user ON seller_earnings_ledger(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_status ON seller_earnings_ledger(earning_status);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_created_at ON seller_earnings_ledger(created_at DESC);

CREATE TABLE IF NOT EXISTS seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_profile_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  seller_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  deductions_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (deductions_amount >= 0),
  net_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  payout_status seller_payout_status NOT NULL DEFAULT 'pending',
  payout_reference VARCHAR(120),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_seller_payouts_profile ON seller_payouts(seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_user ON seller_payouts(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_status ON seller_payouts(payout_status);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_period ON seller_payouts(period_start, period_end);

CREATE TABLE IF NOT EXISTS seller_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_profile_id UUID NULL REFERENCES seller_profiles(id) ON DELETE SET NULL,
  action_type VARCHAR(120) NOT NULL,
  target_entity VARCHAR(120) NOT NULL,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_activity_actor ON seller_activity_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_seller_activity_profile ON seller_activity_logs(seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_seller_activity_created_at ON seller_activity_logs(created_at DESC);

DROP TRIGGER IF EXISTS trg_seller_earnings_updated_at ON seller_earnings_ledger;
CREATE TRIGGER trg_seller_earnings_updated_at
BEFORE UPDATE ON seller_earnings_ledger
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_seller_payouts_updated_at ON seller_payouts;
CREATE TRIGGER trg_seller_payouts_updated_at
BEFORE UPDATE ON seller_payouts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
