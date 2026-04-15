ALTER TABLE auctions
  DROP CONSTRAINT IF EXISTS auctions_cash_prize_check;

UPDATE auctions
SET prize_distribution_type = COALESCE(prize_distribution_type, 'per_winner'),
    prize_amount = CASE
      WHEN auction_type = 'cash_amount'
        AND COALESCE(prize_amount, 0) <= 0
        AND COALESCE(each_winner_amount, 0) > 0
        THEN each_winner_amount
      ELSE prize_amount
    END,
    each_winner_amount = CASE
      WHEN auction_type = 'cash_amount'
        AND COALESCE(prize_distribution_type, 'per_winner') <> 'rank_wise'
        AND COALESCE(each_winner_amount, 0) <= 0
        AND COALESCE(prize_amount, 0) > 0
        THEN prize_amount
      ELSE each_winner_amount
    END
WHERE auction_type = 'cash_amount';

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
