ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS deposit_wallet_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trading_wallet_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS income_wallet_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bonus_wallet_frozen BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS admin_wallet_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_type VARCHAR(40) NOT NULL,
  action_type VARCHAR(40) NOT NULL,
  amount NUMERIC(14,2),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_wallet_actions_target
  ON admin_wallet_actions(target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_wallet_actions_admin
  ON admin_wallet_actions(admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_wallet_actions_wallet_type
  ON admin_wallet_actions(wallet_type, created_at DESC);
