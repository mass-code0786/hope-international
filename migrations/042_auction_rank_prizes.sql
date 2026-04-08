DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auction_prize_distribution_type') THEN
    BEGIN
      ALTER TYPE auction_prize_distribution_type ADD VALUE IF NOT EXISTS 'rank_wise';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS auction_rank_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  winner_rank INTEGER NOT NULL CHECK (winner_rank > 0),
  prize_amount NUMERIC(14,2) NOT NULL CHECK (prize_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (auction_id, winner_rank)
);

CREATE INDEX IF NOT EXISTS idx_auction_rank_prizes_auction_rank
  ON auction_rank_prizes(auction_id, winner_rank);

ALTER TABLE auctions
  DROP CONSTRAINT IF EXISTS auctions_cash_prize_check;

ALTER TABLE auctions
  ADD CONSTRAINT auctions_cash_prize_check CHECK (
    auction_type <> 'cash_amount'
    OR (
      prize_amount IS NOT NULL
      AND prize_amount > 0
      AND winner_count > 0
      AND (
        prize_distribution_type = 'rank_wise'
        OR (
          each_winner_amount IS NOT NULL
          AND each_winner_amount > 0
        )
      )
    )
  );
