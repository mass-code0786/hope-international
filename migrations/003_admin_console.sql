DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS created_by_admin_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_by_admin ON wallet_transactions(created_by_admin_id);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(120) NOT NULL,
  target_entity VARCHAR(120) NOT NULL,
  target_id TEXT,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON admin_audit_logs(target_entity, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (setting_key, setting_value)
VALUES
  ('compensation_settings', jsonb_build_object('matchPercentage', 10, 'directPercentage', 5, 'pvBvRatio', 0.4, 'carryForward', false)),
  ('rank_multipliers', jsonb_build_array(
    jsonb_build_object('name', 'No Rank', 'capMultiplier', 3),
    jsonb_build_object('name', 'Bronze', 'capMultiplier', 4),
    jsonb_build_object('name', 'Silver', 'capMultiplier', 5),
    jsonb_build_object('name', 'Gold', 'capMultiplier', 6),
    jsonb_build_object('name', 'Diamond', 'capMultiplier', 7),
    jsonb_build_object('name', 'Crown', 'capMultiplier', 8)
  )),
  ('reward_slabs', jsonb_build_array(
    jsonb_build_object('thresholdBv', 2000, 'rewardAmount', 100, 'rewardLabel', '100 Cash Reward'),
    jsonb_build_object('thresholdBv', 5000, 'rewardAmount', 250, 'rewardLabel', '250 Cash Reward'),
    jsonb_build_object('thresholdBv', 10000, 'rewardAmount', 500, 'rewardLabel', '500 Cash Reward'),
    jsonb_build_object('thresholdBv', 50000, 'rewardAmount', 1000, 'rewardLabel', '1000 Cash + iPhone'),
    jsonb_build_object('thresholdBv', 100000, 'rewardAmount', 2000, 'rewardLabel', '2000 Cash + Four Wheeler'),
    jsonb_build_object('thresholdBv', 500000, 'rewardAmount', 5000, 'rewardLabel', '5000 Cash + Bungalow')
  ))
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE monthly_reward_qualifications
  ADD COLUMN IF NOT EXISTS reward_level VARCHAR(120),
  ADD COLUMN IF NOT EXISTS reward_extra TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'monthly_reward_qualifications_status_check'
  ) THEN
    ALTER TABLE monthly_reward_qualifications
      ADD CONSTRAINT monthly_reward_qualifications_status_check
      CHECK (status IN ('qualified', 'pending', 'processed', 'rejected'));
  END IF;
END $$;

UPDATE monthly_reward_qualifications
SET status = 'qualified'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_reward_status ON monthly_reward_qualifications(status);
CREATE INDEX IF NOT EXISTS idx_monthly_reward_processed_by ON monthly_reward_qualifications(processed_by);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
