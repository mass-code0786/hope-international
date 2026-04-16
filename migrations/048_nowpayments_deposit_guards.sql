UPDATE nowpayments_payments
SET pay_currency = 'USDT',
    network = 'BSC/BEP20'
WHERE provider = 'nowpayments';

ALTER TABLE nowpayments_payments
  DROP CONSTRAINT IF EXISTS nowpayments_payments_pay_currency_check;

ALTER TABLE nowpayments_payments
  ADD CONSTRAINT nowpayments_payments_pay_currency_check
  CHECK (UPPER(pay_currency) = 'USDT');

UPDATE wallet_deposit_requests
SET asset = 'USDT',
    network = 'BSC/BEP20',
    pay_currency = 'USDT'
WHERE payment_provider = 'nowpayments';

ALTER TABLE wallet_deposit_requests
  DROP CONSTRAINT IF EXISTS wallet_deposit_requests_nowpayments_asset_network_check;

ALTER TABLE wallet_deposit_requests
  ADD CONSTRAINT wallet_deposit_requests_nowpayments_asset_network_check
  CHECK (
    payment_provider IS DISTINCT FROM 'nowpayments'
    OR (
      UPPER(COALESCE(asset, '')) = 'USDT'
      AND COALESCE(network, '') = 'BSC/BEP20'
      AND UPPER(COALESCE(pay_currency, '')) = 'USDT'
    )
  );

CREATE INDEX IF NOT EXISTS idx_nowpayments_payments_credit_status
  ON nowpayments_payments(payment_status, is_credited, created_at DESC);
