ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS withdrawal_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS btct_locked_balance NUMERIC(18,4) NOT NULL DEFAULT 0;

UPDATE wallets
SET withdrawal_balance = COALESCE(withdrawal_balance, 0),
    btct_locked_balance = COALESCE(btct_locked_balance, 0),
    balance = COALESCE(income_balance, balance, 0) + COALESCE(deposit_balance, 0) + COALESCE(withdrawal_balance, 0);

CREATE TABLE IF NOT EXISTS btct_staking_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staking_amount_btct NUMERIC(18,4) NOT NULL CHECK (staking_amount_btct > 0),
  reward_amount_usd NUMERIC(14,2) NOT NULL CHECK (reward_amount_usd > 0),
  payout_interval_days INT NOT NULL CHECK (payout_interval_days > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_payout_at TIMESTAMPTZ NOT NULL,
  last_payout_at TIMESTAMPTZ,
  total_payouts INT NOT NULL DEFAULT 0,
  total_payout_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_btct_staking_one_active_per_user
  ON btct_staking_plans(user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_btct_staking_status_next_payout
  ON btct_staking_plans(status, next_payout_at);

CREATE TABLE IF NOT EXISTS btct_staking_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staking_id UUID NOT NULL REFERENCES btct_staking_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_number INT NOT NULL CHECK (cycle_number > 0),
  payout_amount_usd NUMERIC(14,2) NOT NULL CHECK (payout_amount_usd > 0),
  credited_to VARCHAR(40) NOT NULL DEFAULT 'withdrawal_wallet',
  payout_date TIMESTAMPTZ NOT NULL,
  wallet_transaction_id UUID NULL REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staking_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_btct_staking_payouts_user_date
  ON btct_staking_payouts(user_id, payout_date DESC);

DROP TRIGGER IF EXISTS trg_btct_staking_plans_updated_at ON btct_staking_plans;
CREATE TRIGGER trg_btct_staking_plans_updated_at
BEFORE UPDATE ON btct_staking_plans
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
