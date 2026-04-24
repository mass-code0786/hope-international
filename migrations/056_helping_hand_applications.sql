DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'helping_hand_application_status') THEN
    CREATE TYPE helping_hand_application_status AS ENUM ('pending', 'approved', 'rejected', 'donated');
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
