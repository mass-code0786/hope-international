DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auction_type') THEN
    CREATE TYPE auction_type AS ENUM ('product', 'cash_amount');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auction_prize_distribution_type') THEN
    CREATE TYPE auction_prize_distribution_type AS ENUM ('per_winner', 'shared_pool');
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'auction_win_cash';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS auction_type auction_type NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS prize_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS prize_distribution_type auction_prize_distribution_type NOT NULL DEFAULT 'per_winner',
  ADD COLUMN IF NOT EXISTS each_winner_amount NUMERIC(14,2);

UPDATE auctions
SET auction_type = COALESCE(auction_type, 'product'),
    prize_distribution_type = COALESCE(prize_distribution_type, 'per_winner');

ALTER TABLE auctions
  DROP CONSTRAINT IF EXISTS auctions_cash_prize_check;

ALTER TABLE auctions
  ADD CONSTRAINT auctions_cash_prize_check CHECK (
    auction_type <> 'cash_amount'
    OR (
      prize_amount IS NOT NULL
      AND prize_amount > 0
      AND each_winner_amount IS NOT NULL
      AND each_winner_amount > 0
      AND winner_count > 0
    )
  );

ALTER TABLE auction_winners
  ADD COLUMN IF NOT EXISTS prize_type auction_type NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS prize_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS credited_wallet_type VARCHAR(40),
  ADD COLUMN IF NOT EXISTS credited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallet_transaction_id UUID NULL REFERENCES wallet_transactions(id) ON DELETE SET NULL;

UPDATE auction_winners
SET prize_type = COALESCE(prize_type, 'product');

ALTER TABLE auction_reward_distributions
  ADD COLUMN IF NOT EXISTS cash_awarded NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_transaction_id UUID NULL REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credited_wallet_type VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_auction_reward_distributions_wallet_tx
  ON auction_reward_distributions(wallet_transaction_id);

CREATE INDEX IF NOT EXISTS idx_auction_winners_wallet_tx
  ON auction_winners(wallet_transaction_id);
