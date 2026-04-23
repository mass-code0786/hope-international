DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'autopool_bonus_share';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'autopool_transaction_type') THEN
    BEGIN
      ALTER TYPE autopool_transaction_type ADD VALUE IF NOT EXISTS 'BONUS';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE autopool_entries
  ADD COLUMN IF NOT EXISTS package_amount NUMERIC(14,2);

UPDATE autopool_entries
SET package_amount = 2
WHERE package_amount IS NULL;

ALTER TABLE autopool_entries
  ALTER COLUMN package_amount SET DEFAULT 2;

ALTER TABLE autopool_entries
  ALTER COLUMN package_amount SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'autopool_entries_package_amount_check'
  ) THEN
    ALTER TABLE autopool_entries
      ADD CONSTRAINT autopool_entries_package_amount_check CHECK (package_amount > 0);
  END IF;
END $$;

DROP INDEX IF EXISTS uq_autopool_entries_user_cycle;

CREATE UNIQUE INDEX IF NOT EXISTS uq_autopool_entries_user_package_cycle
  ON autopool_entries(user_id, package_amount, cycle_number);

CREATE INDEX IF NOT EXISTS idx_autopool_entries_package_active_queue
  ON autopool_entries(package_amount, status, filled_slots_count, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_autopool_entries_user_package_created
  ON autopool_entries(user_id, package_amount, created_at DESC);

ALTER TABLE autopool_transactions
  ADD COLUMN IF NOT EXISTS package_amount NUMERIC(14,2);

ALTER TABLE autopool_transactions
  ADD COLUMN IF NOT EXISTS event_key VARCHAR(255);

UPDATE autopool_transactions at
SET package_amount = COALESCE(at.package_amount, ae.package_amount, 2)
FROM autopool_entries ae
WHERE ae.id = at.entry_id
  AND at.package_amount IS NULL;

UPDATE autopool_transactions
SET package_amount = 2
WHERE package_amount IS NULL;

ALTER TABLE autopool_transactions
  ALTER COLUMN package_amount SET DEFAULT 2;

ALTER TABLE autopool_transactions
  ALTER COLUMN package_amount SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'autopool_transactions_package_amount_check'
  ) THEN
    ALTER TABLE autopool_transactions
      ADD CONSTRAINT autopool_transactions_package_amount_check CHECK (package_amount > 0);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_autopool_transactions_event_key
  ON autopool_transactions(event_key)
  WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_autopool_transactions_user_package_created
  ON autopool_transactions(user_id, package_amount, created_at DESC);
