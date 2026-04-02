DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'direct_deposit_income';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'level_deposit_income';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS deposit_team_income_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_deposit_id UUID NOT NULL REFERENCES wallet_deposit_requests(id) ON DELETE CASCADE,
  wallet_transaction_id UUID NULL REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  level_number INT NOT NULL CHECK (level_number BETWEEN 1 AND 7),
  income_type transaction_source NOT NULL,
  percentage_used NUMERIC(6,4) NOT NULL CHECK (percentage_used >= 0),
  base_amount NUMERIC(14,2) NOT NULL CHECK (base_amount > 0),
  credited_amount NUMERIC(14,2) NOT NULL CHECK (credited_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deposit_team_income_ledger_income_type_check CHECK (income_type IN ('direct_deposit_income', 'level_deposit_income')),
  CONSTRAINT deposit_team_income_ledger_unique UNIQUE (source_deposit_id, recipient_user_id, income_type, level_number)
);

CREATE INDEX IF NOT EXISTS idx_deposit_team_income_ledger_recipient_created
  ON deposit_team_income_ledger(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deposit_team_income_ledger_source_deposit
  ON deposit_team_income_ledger(source_deposit_id);
