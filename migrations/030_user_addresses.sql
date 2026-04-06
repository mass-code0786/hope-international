CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(160) NOT NULL,
  mobile VARCHAR(40) NOT NULL,
  alternate_mobile VARCHAR(40) NULL,
  country VARCHAR(120) NOT NULL,
  state VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  area VARCHAR(160) NOT NULL,
  address_line TEXT NOT NULL,
  postal_code VARCHAR(32) NOT NULL,
  delivery_note VARCHAR(500) NULL,
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses (user_id);

DROP TRIGGER IF EXISTS trg_user_addresses_updated_at ON user_addresses;
CREATE TRIGGER trg_user_addresses_updated_at
BEFORE UPDATE ON user_addresses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
