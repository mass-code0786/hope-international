ALTER TABLE deposit_team_income_ledger
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'deposit',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

UPDATE deposit_team_income_ledger
SET source_type = COALESCE(NULLIF(source_type, ''), 'deposit'),
    status = COALESCE(NULLIF(status, ''), 'approved');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deposit_team_income_ledger_source_type_check'
  ) THEN
    ALTER TABLE deposit_team_income_ledger
      ADD CONSTRAINT deposit_team_income_ledger_source_type_check
      CHECK (source_type = 'deposit');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deposit_team_income_ledger_status_check'
  ) THEN
    ALTER TABLE deposit_team_income_ledger
      ADD CONSTRAINT deposit_team_income_ledger_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'reversed'));
  END IF;
END $$;
