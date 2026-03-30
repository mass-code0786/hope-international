CREATE TABLE IF NOT EXISTS auction_result_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (auction_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_auction_result_reveals_auction ON auction_result_reveals(auction_id, revealed_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_result_reveals_user ON auction_result_reveals(user_id, revealed_at DESC);
