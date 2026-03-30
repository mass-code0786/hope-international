ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS btct_balance NUMERIC(18,4) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS btct_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tx_type transaction_type NOT NULL,
  source VARCHAR(80) NOT NULL,
  amount NUMERIC(18,4) NOT NULL CHECK (amount > 0),
  reference_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_admin_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_btct_transactions_user_created ON btct_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_btct_transactions_source_ref ON btct_transactions(source, reference_id);

CREATE TABLE IF NOT EXISTS auction_reward_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  result_type VARCHAR(40) NOT NULL,
  amount_spent NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_entries INT NOT NULL DEFAULT 0,
  total_bids INT NOT NULL DEFAULT 0,
  btct_awarded NUMERIC(18,4) NOT NULL DEFAULT 0,
  btct_transaction_id UUID NULL REFERENCES btct_transactions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  distributed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auction_reward_distributions_type_check CHECK (result_type IN ('winner', 'btct_compensation')),
  CONSTRAINT auction_reward_distributions_unique UNIQUE (auction_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_auction_reward_distributions_auction ON auction_reward_distributions(auction_id, distributed_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_reward_distributions_user ON auction_reward_distributions(user_id, distributed_at DESC);

DROP TRIGGER IF EXISTS trg_auction_reward_distributions_updated_at ON auction_reward_distributions;
CREATE TRIGGER trg_auction_reward_distributions_updated_at
BEFORE UPDATE ON auction_reward_distributions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
