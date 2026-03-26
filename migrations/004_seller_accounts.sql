DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'seller';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seller_application_status') THEN
    CREATE TYPE seller_application_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_moderation_status') THEN
    CREATE TYPE product_moderation_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  legal_name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(120),
  tax_id VARCHAR(120),
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(255),
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(120),
  state VARCHAR(120),
  country VARCHAR(120),
  postal_code VARCHAR(30),
  kyc_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  application_status seller_application_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_status ON seller_profiles(application_status);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_reviewed_by ON seller_profiles(reviewed_by);

CREATE TABLE IF NOT EXISTS seller_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_profile_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(80) NOT NULL,
  document_number VARCHAR(120),
  document_url TEXT NOT NULL,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'submitted',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seller_documents_verification_status_check
    CHECK (verification_status IN ('submitted', 'verified', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_seller_documents_profile_id ON seller_documents(seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_seller_documents_type ON seller_documents(document_type);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS seller_profile_id UUID NULL REFERENCES seller_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_status product_moderation_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderation_notes TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_seller_profile_id ON products(seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_products_moderation_status ON products(moderation_status);

CREATE TABLE IF NOT EXISTS seller_product_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_profile_id UUID NULL REFERENCES seller_profiles(id) ON DELETE SET NULL,
  admin_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  previous_status product_moderation_status,
  next_status product_moderation_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_product_moderation_logs_product ON seller_product_moderation_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_seller_product_moderation_logs_admin ON seller_product_moderation_logs(admin_user_id);

DROP TRIGGER IF EXISTS trg_seller_profiles_updated_at ON seller_profiles;
CREATE TRIGGER trg_seller_profiles_updated_at
BEFORE UPDATE ON seller_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_seller_documents_updated_at ON seller_documents;
CREATE TRIGGER trg_seller_documents_updated_at
BEFORE UPDATE ON seller_documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
