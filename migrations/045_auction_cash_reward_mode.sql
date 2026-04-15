DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auction_reward_mode') THEN
    BEGIN
      ALTER TYPE auction_reward_mode ADD VALUE IF NOT EXISTS 'cash';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS cash_prize NUMERIC(14,2);

UPDATE auctions
SET reward_mode = CASE
      WHEN auction_type = 'cash_amount' THEN 'cash'::auction_reward_mode
      ELSE reward_mode
    END
WHERE auction_type = 'cash_amount'
  AND reward_mode::text <> 'cash';

UPDATE auctions
SET cash_prize = CASE
      WHEN reward_mode::text = 'cash'
        THEN COALESCE(
          NULLIF(cash_prize, 0),
          NULLIF(each_winner_amount, 0),
          NULLIF(prize_amount, 0)
        )
      ELSE NULL
    END,
    auction_type = CASE
      WHEN reward_mode::text = 'cash' THEN 'cash_amount'::auction_type
      ELSE 'product'::auction_type
    END,
    prize_distribution_type = CASE
      WHEN reward_mode::text = 'cash' THEN 'per_winner'::auction_prize_distribution_type
      ELSE COALESCE(prize_distribution_type, 'per_winner'::auction_prize_distribution_type)
    END,
    each_winner_amount = CASE
      WHEN reward_mode::text = 'cash'
        THEN COALESCE(
          NULLIF(cash_prize, 0),
          NULLIF(each_winner_amount, 0),
          NULLIF(prize_amount, 0)
        )
      ELSE NULL
    END,
    prize_amount = CASE
      WHEN reward_mode::text = 'cash'
        THEN COALESCE(
          NULLIF(cash_prize, 0),
          NULLIF(each_winner_amount, 0),
          NULLIF(prize_amount, 0)
        )
      ELSE NULL
    END
WHERE reward_mode::text = 'cash'
   OR auction_type = 'cash_amount'
   OR cash_prize IS NOT NULL;

ALTER TABLE auctions
  DROP CONSTRAINT IF EXISTS auctions_cash_prize_check;

ALTER TABLE auctions
  ADD CONSTRAINT auctions_cash_prize_check CHECK (
    (
      reward_mode = 'cash'
      AND cash_prize IS NOT NULL
      AND cash_prize > 0
    )
    OR (
      reward_mode <> 'cash'
      AND COALESCE(cash_prize, 0) = 0
    )
  );

UPDATE auction_winners
SET reward_mode = 'cash'::auction_reward_mode
WHERE prize_type = 'cash_amount'
  AND reward_mode::text <> 'cash';
