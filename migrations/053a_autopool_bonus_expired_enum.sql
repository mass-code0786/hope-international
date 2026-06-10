DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'autopool_transaction_type'
    AND e.enumlabel = 'BONUS_EXPIRED'
  ) THEN
    ALTER TYPE autopool_transaction_type ADD VALUE 'BONUS_EXPIRED';
  END IF;
END $$;
