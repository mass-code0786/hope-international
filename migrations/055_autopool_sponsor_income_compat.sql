DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'sponsor_pool_income';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

UPDATE wallet_transactions
SET source = 'sponsor_pool_income'
WHERE source = 'autopool_upline_income';

DO $$
DECLARE
  has_modern_autopool_type BOOLEAN := FALSE;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'autopool_transaction_type') THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'autopool_transaction_type'
        AND e.enumlabel = 'AUTOPOOL_ENTRY'
    ) INTO has_modern_autopool_type;

    IF has_modern_autopool_type THEN
      ALTER TABLE autopool_transactions
        ALTER COLUMN type TYPE TEXT
        USING type::text;

      UPDATE autopool_transactions
      SET type = CASE type
        WHEN 'AUTOPOOL_ENTRY' THEN 'ENTRY'
        WHEN 'AUTOPOOL_INCOME' THEN 'EARN'
        WHEN 'SPONSOR_POOL_INCOME' THEN 'UPLINE'
        WHEN 'AUTOPOOL_RECYCLE' THEN 'RECYCLE'
        WHEN 'AUTOPOOL_BONUS_SHARE' THEN 'BONUS'
        ELSE type
      END;

      DROP TYPE IF EXISTS autopool_transaction_type;

      CREATE TYPE autopool_transaction_type AS ENUM (
        'ENTRY',
        'EARN',
        'UPLINE',
        'RECYCLE',
        'AUCTION',
        'BONUS'
      );

      ALTER TABLE autopool_transactions
        ALTER COLUMN type TYPE autopool_transaction_type
        USING type::autopool_transaction_type;
    ELSE
      BEGIN
        ALTER TYPE autopool_transaction_type ADD VALUE IF NOT EXISTS 'BONUS';
      EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;
  END IF;
END $$;
