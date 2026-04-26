DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'autopool_bonus_expired';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'autopool_transaction_type') THEN
    BEGIN
      ALTER TYPE autopool_transaction_type ADD VALUE IF NOT EXISTS 'BONUS_EXPIRED';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS autopool_package_states (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_amount NUMERIC(14,2) NOT NULL,
  income_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  require_reentry BOOLEAN NOT NULL DEFAULT FALSE,
  require_monthly_entry BOOLEAN NOT NULL DEFAULT FALSE,
  last_entry_date TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, package_amount),
  CONSTRAINT autopool_package_states_package_amount_check CHECK (package_amount > 0),
  CONSTRAINT autopool_package_states_income_total_check CHECK (income_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_autopool_package_states_user_updated
  ON autopool_package_states(user_id, updated_at DESC);

DROP TRIGGER IF EXISTS trg_autopool_package_states_updated_at ON autopool_package_states;
CREATE TRIGGER trg_autopool_package_states_updated_at
BEFORE UPDATE ON autopool_package_states
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

WITH latest_purchase AS (
  SELECT DISTINCT ON (ae.user_id, ae.package_amount)
         ae.user_id,
         ae.package_amount,
         ae.created_at AS last_entry_date
  FROM autopool_entries ae
  WHERE ae.entry_source::text = 'purchase'
  ORDER BY ae.user_id, ae.package_amount, ae.created_at DESC, ae.id DESC
),
income_since_purchase AS (
  SELECT
    lp.user_id,
    lp.package_amount,
    COALESCE(SUM(at.amount), 0)::numeric(14,2) AS income_total
  FROM latest_purchase lp
  LEFT JOIN autopool_transactions at
    ON at.user_id = lp.user_id
   AND at.package_amount = lp.package_amount
   AND at.created_at >= lp.last_entry_date
   AND at.type::text IN ('EARN', 'AUTOPOOL_INCOME')
  GROUP BY lp.user_id, lp.package_amount
)
INSERT INTO autopool_package_states (
  user_id,
  package_amount,
  income_total,
  require_reentry,
  require_monthly_entry,
  last_entry_date
)
SELECT
  lp.user_id,
  lp.package_amount,
  COALESCE(isp.income_total, 0)::numeric(14,2) AS income_total,
  COALESCE(isp.income_total, 0) >= (lp.package_amount * 5) AS require_reentry,
  lp.last_entry_date < (NOW() - INTERVAL '30 days') AS require_monthly_entry,
  lp.last_entry_date
FROM latest_purchase lp
LEFT JOIN income_since_purchase isp
  ON isp.user_id = lp.user_id
 AND isp.package_amount = lp.package_amount
ON CONFLICT (user_id, package_amount) DO UPDATE
SET income_total = EXCLUDED.income_total,
    require_reentry = EXCLUDED.require_reentry,
    require_monthly_entry = EXCLUDED.require_monthly_entry,
    last_entry_date = COALESCE(EXCLUDED.last_entry_date, autopool_package_states.last_entry_date),
    updated_at = NOW();

CREATE TABLE IF NOT EXISTS autopool_bonus_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id UUID NULL REFERENCES autopool_entries(id) ON DELETE SET NULL,
  package_amount NUMERIC(14,2) NOT NULL,
  wallet_transaction_id UUID NOT NULL UNIQUE REFERENCES wallet_transactions(id) ON DELETE CASCADE,
  original_amount NUMERIC(14,2) NOT NULL CHECK (original_amount > 0),
  remaining_amount NUMERIC(14,2) NOT NULL CHECK (remaining_amount >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  expired_at TIMESTAMPTZ NULL,
  expiration_wallet_transaction_id UUID NULL REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autopool_bonus_credits_user_expires
  ON autopool_bonus_credits(user_id, expires_at ASC, created_at ASC)
  WHERE remaining_amount > 0 AND expired_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_autopool_bonus_credits_expiry_scan
  ON autopool_bonus_credits(expires_at ASC, created_at ASC)
  WHERE remaining_amount > 0 AND expired_at IS NULL;

DROP TRIGGER IF EXISTS trg_autopool_bonus_credits_updated_at ON autopool_bonus_credits;
CREATE TRIGGER trg_autopool_bonus_credits_updated_at
BEFORE UPDATE ON autopool_bonus_credits
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
