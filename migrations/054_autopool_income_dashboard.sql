DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'sponsor_pool_income';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'autopool_transactions'
      AND column_name = 'type'
  ) THEN
    ALTER TABLE autopool_transactions
      ALTER COLUMN type TYPE TEXT
      USING type::text;

    UPDATE autopool_transactions
    SET type = CASE type
      WHEN 'ENTRY' THEN 'AUTOPOOL_ENTRY'
      WHEN 'EARN' THEN 'AUTOPOOL_INCOME'
      WHEN 'UPLINE' THEN 'SPONSOR_POOL_INCOME'
      WHEN 'RECYCLE' THEN 'AUTOPOOL_RECYCLE'
      WHEN 'BONUS' THEN 'AUTOPOOL_BONUS_SHARE'
      WHEN 'AUCTION' THEN 'AUTOPOOL_BONUS_SHARE'
      ELSE type
    END;

    DROP TYPE IF EXISTS autopool_transaction_type;

    CREATE TYPE autopool_transaction_type AS ENUM (
      'AUTOPOOL_ENTRY',
      'AUTOPOOL_INCOME',
      'SPONSOR_POOL_INCOME',
      'AUTOPOOL_RECYCLE',
      'AUTOPOOL_BONUS_SHARE'
    );

    ALTER TABLE autopool_transactions
      ALTER COLUMN type TYPE autopool_transaction_type
      USING type::autopool_transaction_type;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_autopool_transactions_user_type_package_created
  ON autopool_transactions(user_id, type, package_amount, created_at DESC);
