ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS trading_balance NUMERIC(14,2) NOT NULL DEFAULT 0;

UPDATE wallets
SET trading_balance = CASE
      WHEN COALESCE(trading_balance, 0) > 0 THEN COALESCE(trading_balance, 0)
      ELSE COALESCE(withdrawal_balance, 0)
    END,
    balance = COALESCE(income_balance, balance, 0)
      + COALESCE(deposit_balance, 0)
      + CASE
          WHEN COALESCE(trading_balance, 0) > 0 THEN COALESCE(trading_balance, 0)
          ELSE COALESCE(withdrawal_balance, 0)
        END;
