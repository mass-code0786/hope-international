CREATE SEQUENCE IF NOT EXISTS hope_millionaire_entry_queue_position_seq;

ALTER TABLE hope_millionaire_entries
  ADD COLUMN IF NOT EXISTS queue_position BIGINT;

WITH ranked_entries AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS queue_position
  FROM hope_millionaire_entries
  WHERE queue_position IS NULL
)
UPDATE hope_millionaire_entries entry
SET queue_position = ranked_entries.queue_position
FROM ranked_entries
WHERE entry.id = ranked_entries.id;

SELECT setval(
  'hope_millionaire_entry_queue_position_seq',
  GREATEST(COALESCE((SELECT MAX(queue_position) FROM hope_millionaire_entries), 0) + 1, 1),
  FALSE
);

ALTER TABLE hope_millionaire_entries
  ALTER COLUMN queue_position SET DEFAULT nextval('hope_millionaire_entry_queue_position_seq'),
  ALTER COLUMN queue_position SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hope_millionaire_queue_position
  ON hope_millionaire_entries(queue_position);

DROP INDEX IF EXISTS idx_hope_millionaire_open_queue;

CREATE INDEX IF NOT EXISTS idx_hope_millionaire_open_queue
  ON hope_millionaire_entries(package_amount, queue_position)
  WHERE status = 'open' AND filled_slots < 3;
