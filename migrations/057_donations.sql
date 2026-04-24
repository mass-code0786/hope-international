DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'donation';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_status') THEN
    CREATE TYPE donation_status AS ENUM ('completed', 'failed', 'reversed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  purpose VARCHAR(60) NOT NULL,
  note TEXT,
  status donation_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_user_created
  ON donations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_donations_status_created
  ON donations(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_donations_updated_at ON donations;
CREATE TRIGGER trg_donations_updated_at
BEFORE UPDATE ON donations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
