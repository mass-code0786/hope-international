DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auction_reward_mode') THEN
    CREATE TYPE auction_reward_mode AS ENUM ('stock', 'split');
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'auction_entry';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS entry_price NUMERIC(14,2) CHECK (entry_price >= 0.5 AND entry_price <= 100),
  ADD COLUMN IF NOT EXISTS hidden_capacity INT CHECK (hidden_capacity > 0),
  ADD COLUMN IF NOT EXISTS stock_quantity INT NOT NULL DEFAULT 1 CHECK (stock_quantity > 0),
  ADD COLUMN IF NOT EXISTS reward_mode auction_reward_mode NOT NULL DEFAULT 'stock',
  ADD COLUMN IF NOT EXISTS reward_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS total_entries INT NOT NULL DEFAULT 0;

UPDATE auctions
SET entry_price = COALESCE(entry_price, starting_price),
    hidden_capacity = COALESCE(hidden_capacity, 100),
    total_entries = COALESCE(total_entries, total_bids)
WHERE entry_price IS NULL OR hidden_capacity IS NULL OR total_entries IS NULL;

ALTER TABLE auctions
  ALTER COLUMN entry_price SET NOT NULL,
  ALTER COLUMN hidden_capacity SET NOT NULL;

ALTER TABLE auction_bids
  ADD COLUMN IF NOT EXISTS entry_count INT NOT NULL DEFAULT 1 CHECK (entry_count > 0),
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2);

UPDATE auction_bids
SET entry_count = COALESCE(entry_count, 1),
    total_amount = COALESCE(total_amount, amount);

ALTER TABLE auction_bids
  ALTER COLUMN total_amount SET NOT NULL;

ALTER TABLE auction_participants
  ADD COLUMN IF NOT EXISTS total_entries INT NOT NULL DEFAULT 0;

UPDATE auction_participants
SET total_entries = COALESCE(total_entries, total_bids);

CREATE TABLE IF NOT EXISTS auction_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  winning_entry_count INT NOT NULL CHECK (winning_entry_count > 0),
  allocation_ratio NUMERIC(14,6) NOT NULL DEFAULT 1 CHECK (allocation_ratio > 0),
  allocation_quantity NUMERIC(14,2),
  reward_mode auction_reward_mode NOT NULL DEFAULT 'stock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (auction_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_auction_winners_auction ON auction_winners(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_winners_user ON auction_winners(user_id, created_at DESC);
