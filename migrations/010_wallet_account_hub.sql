DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'deposit_request';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'withdrawal_request';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'p2p_transfer';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_request_status') THEN
    CREATE TYPE wallet_request_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_wallet_bindings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL,
  network VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method VARCHAR(60) NOT NULL DEFAULT 'manual',
  instructions TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status wallet_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_user_created ON wallet_deposit_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_deposit_requests_status ON wallet_deposit_requests(status);

CREATE TABLE IF NOT EXISTS wallet_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  wallet_address VARCHAR(255) NOT NULL,
  network VARCHAR(60),
  notes TEXT,
  status wallet_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawal_requests_user_created ON wallet_withdrawal_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawal_requests_status ON wallet_withdrawal_requests(status);

CREATE TABLE IF NOT EXISTS wallet_p2p_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  status wallet_request_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_p2p_sender_receiver_check CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_p2p_transfers_from_user_created ON wallet_p2p_transfers(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_p2p_transfers_to_user_created ON wallet_p2p_transfers(to_user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_user_wallet_bindings_updated_at ON user_wallet_bindings;
CREATE TRIGGER trg_user_wallet_bindings_updated_at
BEFORE UPDATE ON user_wallet_bindings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_wallet_deposit_requests_updated_at ON wallet_deposit_requests;
CREATE TRIGGER trg_wallet_deposit_requests_updated_at
BEFORE UPDATE ON wallet_deposit_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_wallet_withdrawal_requests_updated_at ON wallet_withdrawal_requests;
CREATE TRIGGER trg_wallet_withdrawal_requests_updated_at
BEFORE UPDATE ON wallet_withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
