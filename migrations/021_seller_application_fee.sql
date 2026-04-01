DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'seller_application_fee';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
