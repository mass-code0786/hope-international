ALTER TABLE wallet_deposit_requests
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(60),
  ADD COLUMN IF NOT EXISTS payment_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS order_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(60),
  ADD COLUMN IF NOT EXISTS pay_currency VARCHAR(30),
  ADD COLUMN IF NOT EXISTS pay_amount NUMERIC(18,8),
  ADD COLUMN IF NOT EXISTS pay_address TEXT,
  ADD COLUMN IF NOT EXISTS payment_url TEXT,
  ADD COLUMN IF NOT EXISTS is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_webhook_data JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_deposit_requests_payment_id
  ON wallet_deposit_requests(payment_id)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_deposit_requests_order_id
  ON wallet_deposit_requests(order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_payment_provider_status
  ON wallet_deposit_requests(payment_provider, payment_status, created_at DESC);
