ALTER TABLE ranks
  ADD COLUMN IF NOT EXISTS display_order INT;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY min_bv ASC, name ASC) AS rn
  FROM ranks
)
UPDATE ranks r
SET display_order = ordered.rn
FROM ordered
WHERE r.id = ordered.id
  AND r.display_order IS NULL;

CREATE INDEX IF NOT EXISTS idx_ranks_display_order ON ranks(display_order);
