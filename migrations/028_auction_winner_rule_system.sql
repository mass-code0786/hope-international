ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS winner_modes JSONB NOT NULL DEFAULT '["highest"]'::jsonb;

UPDATE auctions
SET winner_count = CASE WHEN COALESCE(winner_count, 0) > 0 THEN winner_count ELSE 1 END,
    winner_modes = CASE
      WHEN winner_modes IS NULL OR jsonb_typeof(winner_modes) <> 'array' OR jsonb_array_length(winner_modes) = 0
        THEN '["highest"]'::jsonb
      ELSE winner_modes
    END;

ALTER TABLE auction_winners
  ADD COLUMN IF NOT EXISTS winner_mode VARCHAR(20) NOT NULL DEFAULT 'highest',
  ADD COLUMN IF NOT EXISTS selection_rank INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sequence_position INT,
  ADD COLUMN IF NOT EXISTS total_bids_snapshot INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_entries_snapshot INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selection_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE auction_winners
SET winner_mode = COALESCE(NULLIF(winner_mode, ''), 'highest'),
    selection_rank = COALESCE(selection_rank, 1),
    total_bids_snapshot = COALESCE(total_bids_snapshot, winning_entry_count, 0),
    total_entries_snapshot = COALESCE(total_entries_snapshot, winning_entry_count, 0),
    selection_metadata = COALESCE(selection_metadata, '{}'::jsonb);

DROP INDEX IF EXISTS idx_auction_winners_auction;
CREATE INDEX IF NOT EXISTS idx_auction_winners_auction ON auction_winners(auction_id, selection_rank ASC, created_at ASC);

ALTER TABLE auction_winners
  DROP CONSTRAINT IF EXISTS auction_winners_winner_mode_check;

ALTER TABLE auction_winners
  ADD CONSTRAINT auction_winners_winner_mode_check CHECK (winner_mode IN ('highest', 'middle', 'last'));
