ALTER TABLE auctions
  DROP CONSTRAINT IF EXISTS auctions_starting_price_check,
  DROP CONSTRAINT IF EXISTS auctions_min_bid_increment_check,
  DROP CONSTRAINT IF EXISTS auctions_current_bid_check,
  DROP CONSTRAINT IF EXISTS auctions_entry_price_check;

ALTER TABLE auctions
  ADD CONSTRAINT auctions_starting_price_check CHECK (starting_price >= 0.10),
  ADD CONSTRAINT auctions_min_bid_increment_check CHECK (min_bid_increment >= 0.10),
  ADD CONSTRAINT auctions_current_bid_check CHECK (current_bid >= 0.10),
  ADD CONSTRAINT auctions_entry_price_check CHECK (entry_price >= 0.10);

ALTER TABLE auction_bids
  DROP CONSTRAINT IF EXISTS auction_bids_amount_check;

ALTER TABLE auction_bids
  ADD CONSTRAINT auction_bids_amount_check CHECK (amount >= 0.10);

ALTER TABLE auction_participants
  DROP CONSTRAINT IF EXISTS auction_participants_highest_bid_check;

ALTER TABLE auction_participants
  ADD CONSTRAINT auction_participants_highest_bid_check CHECK (highest_bid >= 0.10);
