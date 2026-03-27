ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(40),
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(12);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_ci ON users ((LOWER(username)));

UPDATE users
SET
  first_name = COALESCE(first_name, username),
  last_name = COALESCE(last_name, ''),
  country_code = COALESCE(country_code, '+1')
WHERE first_name IS NULL OR last_name IS NULL OR country_code IS NULL;
