DO $$
BEGIN
  BEGIN
    ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'wallet_transfer';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS from_wallet VARCHAR(40),
  ADD COLUMN IF NOT EXISTS to_wallet VARCHAR(40),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS reference_code VARCHAR(40);

UPDATE wallet_transactions
SET status = COALESCE(NULLIF(status, ''), 'success')
WHERE status IS NULL OR status = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wallet_transactions_status_check'
  ) THEN
    ALTER TABLE wallet_transactions
      ADD CONSTRAINT wallet_transactions_status_check
      CHECK (status IN ('success', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference_code
  ON wallet_transactions(reference_code);
