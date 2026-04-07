DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'welcome_spin_bonus';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS welcome_spin_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_claimed_welcome_spin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS welcome_spin_claimed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS welcome_spin_reward_amount NUMERIC(14,2) NULL;

ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS auction_bonus_balance NUMERIC(14,2) NOT NULL DEFAULT 0;
