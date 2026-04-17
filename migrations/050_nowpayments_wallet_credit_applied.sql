ALTER TABLE nowpayments_payments
  ADD COLUMN IF NOT EXISTS wallet_credit_applied BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE nowpayments_payments
SET wallet_credit_applied = is_credited
WHERE wallet_credit_applied IS DISTINCT FROM is_credited;

CREATE INDEX IF NOT EXISTS idx_nowpayments_payments_wallet_credit_applied
  ON nowpayments_payments(wallet_credit_applied, payment_status, created_at DESC);
