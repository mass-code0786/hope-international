DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'helping_hand_application_status') THEN
    CREATE TYPE helping_hand_application_status AS ENUM ('pending', 'approved', 'rejected', 'donated');
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'donation';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_status') THEN
    CREATE TYPE donation_status AS ENUM ('completed', 'failed', 'reversed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS helping_hand_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applicant_name VARCHAR(255) NOT NULL,
  applicant_phone VARCHAR(40) NOT NULL,
  applicant_address TEXT NOT NULL,
  applicant_relation VARCHAR(40) NOT NULL,
  help_category VARCHAR(60) NOT NULL,
  requested_amount NUMERIC(14,2) NOT NULL CHECK (requested_amount > 0),
  reason TEXT NOT NULL,
  document_url TEXT,
  status helping_hand_application_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE helping_hand_applications
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS applicant_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS applicant_phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS applicant_address TEXT,
  ADD COLUMN IF NOT EXISTS applicant_relation VARCHAR(40),
  ADD COLUMN IF NOT EXISTS help_category VARCHAR(60),
  ADD COLUMN IF NOT EXISTS requested_amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS status helping_hand_application_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE helping_hand_applications
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN status SET DEFAULT 'pending';

UPDATE helping_hand_applications
SET id = gen_random_uuid()
WHERE id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'helping_hand_applications'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE helping_hand_applications
      ADD CONSTRAINT helping_hand_applications_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'helping_hand_applications_user_id_fkey'
  ) THEN
    ALTER TABLE helping_hand_applications
      ADD CONSTRAINT helping_hand_applications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_helping_hand_applications_user_id
  ON helping_hand_applications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_helping_hand_applications_status
  ON helping_hand_applications(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_helping_hand_applications_created_at
  ON helping_hand_applications(created_at DESC);

DROP TRIGGER IF EXISTS trg_helping_hand_applications_updated_at ON helping_hand_applications;
CREATE TRIGGER trg_helping_hand_applications_updated_at
BEFORE UPDATE ON helping_hand_applications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  purpose VARCHAR(60) NOT NULL,
  note TEXT,
  status donation_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS purpose VARCHAR(60),
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS status donation_status DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE donations
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN status SET DEFAULT 'completed';

UPDATE donations
SET id = gen_random_uuid()
WHERE id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'donations'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE donations
      ADD CONSTRAINT donations_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'donations_user_id_fkey'
  ) THEN
    ALTER TABLE donations
      ADD CONSTRAINT donations_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_donations_user_created
  ON donations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_donations_status_created
  ON donations(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_donations_updated_at ON donations;
CREATE TRIGGER trg_donations_updated_at
BEFORE UPDATE ON donations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
