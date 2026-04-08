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
