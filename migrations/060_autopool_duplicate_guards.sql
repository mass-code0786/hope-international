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
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT user_id, package_amount, cycle_number
      FROM autopool_entries
      GROUP BY user_id, package_amount, cycle_number
      HAVING COUNT(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION 'Duplicate autopool_entries rows still exist for (user_id, package_amount, cycle_number). Resolve them before applying migration 060.';
  END IF;
END $$;

DROP INDEX IF EXISTS uq_autopool_entries_user_cycle;

CREATE UNIQUE INDEX IF NOT EXISTS uq_autopool_entries_user_package_cycle
  ON autopool_entries(user_id, package_amount, cycle_number);

ALTER TABLE autopool_entries
  DROP CONSTRAINT IF EXISTS autopool_entries_parent_slot_check;

ALTER TABLE autopool_entries
  ADD CONSTRAINT autopool_entries_parent_slot_check CHECK (
    (parent_entry_id IS NULL AND slot_position IS NULL)
    OR (parent_entry_id IS NOT NULL AND slot_position IS NOT NULL)
  );
