ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS has_tie BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS winner_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_auctions_product_id ON auctions(product_id);

UPDATE auctions a
SET product_id = NULL,
    has_tie = COALESCE(has_tie, FALSE),
    winner_count = COALESCE(winner_count, 0)
WHERE TRUE;
