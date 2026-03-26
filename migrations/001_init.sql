CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'placement_side') THEN
    CREATE TYPE placement_side AS ENUM ('left', 'right');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    CREATE TYPE transaction_source AS ENUM ('matching_income', 'order_purchase', 'manual_adjustment');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('pending', 'paid', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ranks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  min_bv NUMERIC(14,2) NOT NULL CHECK (min_bv >= 0)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  sponsor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  parent_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  placement_side placement_side NULL,
  left_child_id UUID NULL,
  right_child_id UUID NULL,
  self_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  carry_left_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  carry_right_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_left_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_right_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  lifetime_bv NUMERIC(14,2) NOT NULL DEFAULT 0,
  rank_id INT NOT NULL REFERENCES ranks(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT placement_parent_check CHECK (
    (parent_id IS NULL AND placement_side IS NULL)
    OR (parent_id IS NOT NULL AND placement_side IS NOT NULL)
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_left_child_fk'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_left_child_fk FOREIGN KEY (left_child_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_right_child_fk'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_right_child_fk FOREIGN KEY (right_child_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
CREATE INDEX IF NOT EXISTS idx_users_sponsor_id ON users(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_users_rank_id ON users(rank_id);

CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tx_type transaction_type NOT NULL,
  source transaction_source NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reference_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  pv NUMERIC(14,2) NOT NULL CHECK (pv >= 0),
  bv NUMERIC(14,2) NOT NULL CHECK (bv >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status order_status NOT NULL DEFAULT 'paid',
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
  total_pv NUMERIC(14,2) NOT NULL CHECK (total_pv >= 0),
  total_bv NUMERIC(14,2) NOT NULL CHECK (total_bv >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  pv NUMERIC(14,2) NOT NULL CHECK (pv >= 0),
  bv NUMERIC(14,2) NOT NULL CHECK (bv >= 0),
  line_total NUMERIC(14,2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

CREATE TABLE IF NOT EXISTS binary_volume_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ancestor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  leg placement_side NOT NULL,
  pv NUMERIC(14,2) NOT NULL CHECK (pv >= 0),
  bv NUMERIC(14,2) NOT NULL CHECK (bv >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volume_ancestor ON binary_volume_ledger(ancestor_user_id);

CREATE TABLE IF NOT EXISTS matching_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS matching_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES matching_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  left_pv_before NUMERIC(14,2) NOT NULL,
  right_pv_before NUMERIC(14,2) NOT NULL,
  matched_pv NUMERIC(14,2) NOT NULL,
  gross_income NUMERIC(14,2) NOT NULL,
  cap_limit NUMERIC(14,2) NOT NULL,
  net_income NUMERIC(14,2) NOT NULL,
  flushed_left_pv NUMERIC(14,2) NOT NULL,
  flushed_right_pv NUMERIC(14,2) NOT NULL,
  carry_left_after NUMERIC(14,2) NOT NULL,
  carry_right_after NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(run_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_matching_results_user_id ON matching_results(user_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_wallets_updated_at ON wallets;
CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
