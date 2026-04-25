DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'admin_credit';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE wallet_deposit_requests
  ADD COLUMN IF NOT EXISTS approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE wallet_deposit_requests
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE wallet_deposit_requests
  ALTER COLUMN status TYPE TEXT
  USING (
    CASE LOWER(COALESCE(status::text, 'pending'))
      WHEN 'approved' THEN 'SUCCESS'
      WHEN 'completed' THEN 'SUCCESS'
      WHEN 'success' THEN 'SUCCESS'
      WHEN 'failed' THEN 'FAILED'
      WHEN 'rejected' THEN 'REJECTED'
      ELSE 'PENDING'
    END
  );

UPDATE wallet_deposit_requests
SET status = CASE UPPER(COALESCE(status, 'PENDING'))
  WHEN 'APPROVED' THEN 'SUCCESS'
  WHEN 'COMPLETED' THEN 'SUCCESS'
  WHEN 'SUCCESS' THEN 'SUCCESS'
  WHEN 'FAILED' THEN 'FAILED'
  WHEN 'REJECTED' THEN 'REJECTED'
  ELSE 'PENDING'
END;

ALTER TABLE wallet_deposit_requests
  ALTER COLUMN status SET DEFAULT 'PENDING';

ALTER TABLE wallet_deposit_requests
  DROP CONSTRAINT IF EXISTS wallet_deposit_requests_status_check;

ALTER TABLE wallet_deposit_requests
  ADD CONSTRAINT wallet_deposit_requests_status_check
  CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REJECTED'));

CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_approved_by
  ON wallet_deposit_requests(approved_by);

CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_status_created
  ON wallet_deposit_requests(status, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_transfers_admin_created
  ON admin_transfers(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_transfers_user_created
  ON admin_transfers(user_id, created_at DESC);
