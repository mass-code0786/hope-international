ALTER TABLE wallet_deposit_requests
  ADD COLUMN IF NOT EXISTS asset VARCHAR(20) NOT NULL DEFAULT 'USDT',
  ADD COLUMN IF NOT EXISTS network VARCHAR(20) NOT NULL DEFAULT 'BEP20',
  ADD COLUMN IF NOT EXISTS wallet_address_snapshot VARCHAR(255),
  ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS proof_image_url TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

UPDATE wallet_deposit_requests
SET asset = COALESCE(NULLIF(asset, ''), 'USDT'),
    network = COALESCE(NULLIF(network, ''), 'BEP20'),
    wallet_address_snapshot = COALESCE(wallet_address_snapshot, details->>'walletAddressSnapshot', details->>'walletAddress'),
    transaction_hash = COALESCE(transaction_hash, details->>'transactionReference', details->>'txHash'),
    proof_image_url = COALESCE(proof_image_url, details->>'proofImageUrl')
WHERE asset IS NULL
   OR network IS NULL
   OR wallet_address_snapshot IS NULL
   OR transaction_hash IS NULL
   OR proof_image_url IS NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_transaction_hash ON wallet_deposit_requests(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_reviewed_by ON wallet_deposit_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_created_status ON wallet_deposit_requests(status, created_at DESC);

INSERT INTO app_settings (setting_key, setting_value)
VALUES (
  'deposit_wallet_config',
  jsonb_build_object(
    'asset', 'USDT',
    'network', 'BEP20',
    'walletAddress', '',
    'qrImageUrl', '',
    'isActive', false,
    'instructions', 'Send only USDT on the BEP20 network. Deposits are credited after admin verification.'
  )
)
ON CONFLICT (setting_key) DO NOTHING;
