CREATE TABLE IF NOT EXISTS nowpayments_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deposit_id UUID REFERENCES wallet_deposit_requests(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'nowpayments',
  provider_payment_id VARCHAR(120),
  provider_order_id VARCHAR(120),
  network VARCHAR(30) NOT NULL DEFAULT 'BSC/BEP20',
  requested_amount NUMERIC(14,2) NOT NULL,
  expected_amount NUMERIC(24,8),
  price_amount NUMERIC(14,2) NOT NULL,
  price_currency VARCHAR(20) NOT NULL DEFAULT 'usd',
  pay_currency VARCHAR(30) NOT NULL,
  pay_amount NUMERIC(24,8),
  payment_address TEXT,
  pay_address TEXT,
  payment_status VARCHAR(40) NOT NULL DEFAULT 'waiting',
  actually_paid NUMERIC(24,8) NOT NULL DEFAULT 0,
  outcome_amount NUMERIC(24,8),
  outcome_currency VARCHAR(30),
  payment_url TEXT,
  ipn_callback_url TEXT,
  expires_at TIMESTAMPTZ,
  is_credited BOOLEAN NOT NULL DEFAULT FALSE,
  credited_at TIMESTAMPTZ,
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nowpayments_payments_provider_check CHECK (provider = 'nowpayments'),
  CONSTRAINT nowpayments_payments_pay_currency_check CHECK (LOWER(pay_currency) IN ('usdt', 'usdtbsc')),
  CONSTRAINT nowpayments_payments_network_check CHECK (network = 'BSC/BEP20'),
  CONSTRAINT nowpayments_payments_target_check CHECK (
    deposit_id IS NOT NULL OR order_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_nowpayments_payments_provider_payment_id
  ON nowpayments_payments(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_nowpayments_payments_provider_order_id
  ON nowpayments_payments(provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nowpayments_payments_user_created
  ON nowpayments_payments(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nowpayments_payments_status
  ON nowpayments_payments(payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nowpayments_payments_deposit_id
  ON nowpayments_payments(deposit_id);

DROP TRIGGER IF EXISTS trg_nowpayments_payments_updated_at ON nowpayments_payments;
CREATE TRIGGER trg_nowpayments_payments_updated_at
BEFORE UPDATE ON nowpayments_payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
