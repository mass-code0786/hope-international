DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auction_status') THEN
    CREATE TYPE auction_status AS ENUM ('upcoming', 'live', 'ended', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  short_description VARCHAR(400),
  description TEXT,
  specifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  starting_price NUMERIC(14,2) NOT NULL CHECK (starting_price >= 0.5 AND starting_price <= 100),
  min_bid_increment NUMERIC(14,2) NOT NULL DEFAULT 0.5 CHECK (min_bid_increment >= 0.5 AND min_bid_increment <= 100),
  current_bid NUMERIC(14,2) NOT NULL DEFAULT 0.5 CHECK (current_bid >= 0.5 AND current_bid <= 100),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status auction_status NOT NULL DEFAULT 'upcoming',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  cancelled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  close_reason VARCHAR(255),
  winner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  winning_bid_id UUID,
  total_bids INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auctions_time_check CHECK (end_at > start_at)
);

CREATE TABLE IF NOT EXISTS auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0.5 AND amount <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auction_participants (
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_bid_at TIMESTAMPTZ,
  total_bids INT NOT NULL DEFAULT 0,
  highest_bid NUMERIC(14,2) NOT NULL DEFAULT 0.5 CHECK (highest_bid >= 0.5 AND highest_bid <= 100),
  PRIMARY KEY (auction_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_schedule ON auctions(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_created ON auction_bids(auction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bids_user_created ON auction_bids(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_participants_user ON auction_participants(user_id, last_bid_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'auctions_winning_bid_fk'
  ) THEN
    ALTER TABLE auctions
      ADD CONSTRAINT auctions_winning_bid_fk FOREIGN KEY (winning_bid_id) REFERENCES auction_bids(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_auctions_updated_at ON auctions;
CREATE TRIGGER trg_auctions_updated_at
BEFORE UPDATE ON auctions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
