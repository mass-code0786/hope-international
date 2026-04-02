ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS income_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_balance NUMERIC(14,2) NOT NULL DEFAULT 0;

UPDATE wallets
SET income_balance = COALESCE(income_balance, balance, 0),
    deposit_balance = COALESCE(deposit_balance, 0),
    balance = COALESCE(income_balance, balance, 0) + COALESCE(deposit_balance, 0);
