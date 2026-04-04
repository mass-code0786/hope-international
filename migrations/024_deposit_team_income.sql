DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'direct_deposit_income';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'level_deposit_income';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
