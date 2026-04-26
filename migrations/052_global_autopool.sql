DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'autopool_entry';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'autopool_matrix_income';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'autopool_upline_income';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'autopool_auction_share';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'autopool_entry_status') THEN
    CREATE TYPE autopool_entry_status AS ENUM ('active', 'completed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'autopool_entry_source') THEN
    CREATE TYPE autopool_entry_source AS ENUM ('purchase', 'recycle');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'autopool_transaction_type') THEN
    CREATE TYPE autopool_transaction_type AS ENUM ('ENTRY', 'EARN', 'UPLINE', 'RECYCLE', 'AUCTION');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS autopool_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_entry_id UUID NULL REFERENCES autopool_entries(id) ON DELETE SET NULL,
  slot_position SMALLINT NULL,
  filled_slots_count SMALLINT NOT NULL DEFAULT 0,
  status autopool_entry_status NOT NULL DEFAULT 'active',
  entry_source autopool_entry_source NOT NULL DEFAULT 'purchase',
  recycle_count INT NOT NULL DEFAULT 0,
  cycle_number INT NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT autopool_entries_slot_position_check CHECK (
    slot_position IS NULL OR slot_position BETWEEN 1 AND 3
  ),
  CONSTRAINT autopool_entries_filled_slots_check CHECK (
    filled_slots_count BETWEEN 0 AND 3
  ),
  CONSTRAINT autopool_entries_recycle_count_check CHECK (
    recycle_count >= 0
  ),
  CONSTRAINT autopool_entries_cycle_number_check CHECK (
    cycle_number >= 1
  ),
  CONSTRAINT autopool_entries_parent_slot_check CHECK (
    (parent_entry_id IS NULL AND slot_position IS NULL)
    OR (parent_entry_id IS NOT NULL AND slot_position IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS autopool_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_entry_id UUID NOT NULL REFERENCES autopool_entries(id) ON DELETE CASCADE,
  child_entry_id UUID NOT NULL UNIQUE REFERENCES autopool_entries(id) ON DELETE CASCADE,
  slot_position SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT autopool_children_slot_position_check CHECK (
    slot_position BETWEEN 1 AND 3
  ),
  CONSTRAINT autopool_children_parent_slot_unique UNIQUE (parent_entry_id, slot_position)
);

CREATE TABLE IF NOT EXISTS autopool_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id UUID NULL REFERENCES autopool_entries(id) ON DELETE CASCADE,
  type autopool_transaction_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  source_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  wallet_transaction_id UUID NULL REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  request_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS autopool_queue (
  entry_id UUID PRIMARY KEY REFERENCES autopool_entries(id) ON DELETE CASCADE,
  position BIGSERIAL NOT NULL UNIQUE,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_autopool_entries_parent_slot
  ON autopool_entries(parent_entry_id, slot_position)
  WHERE parent_entry_id IS NOT NULL;

DROP INDEX IF EXISTS uq_autopool_entries_user_cycle;

CREATE UNIQUE INDEX IF NOT EXISTS uq_autopool_transactions_user_request
  ON autopool_transactions(user_id, request_id)
  WHERE request_id IS NOT NULL AND type = 'ENTRY';

CREATE INDEX IF NOT EXISTS idx_autopool_entries_status_created
  ON autopool_entries(status, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_autopool_entries_active_queue
  ON autopool_entries(status, filled_slots_count, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_autopool_entries_user_created
  ON autopool_entries(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autopool_entries_parent_slot
  ON autopool_entries(parent_entry_id, slot_position);

CREATE INDEX IF NOT EXISTS idx_autopool_children_parent
  ON autopool_children(parent_entry_id, slot_position);

CREATE INDEX IF NOT EXISTS idx_autopool_transactions_user_created
  ON autopool_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autopool_transactions_entry_created
  ON autopool_transactions(entry_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autopool_transactions_request_id
  ON autopool_transactions(request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_autopool_queue_position
  ON autopool_queue(position ASC);

DROP TRIGGER IF EXISTS trg_autopool_entries_updated_at ON autopool_entries;
CREATE TRIGGER trg_autopool_entries_updated_at
BEFORE UPDATE ON autopool_entries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
