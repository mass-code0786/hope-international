DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_source') THEN
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'direct_income';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'reward_qualification';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE transaction_source ADD VALUE IF NOT EXISTS 'cap_overflow';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE ranks
  ADD COLUMN IF NOT EXISTS cap_multiplier NUMERIC(6,2) NOT NULL DEFAULT 3;
ALTER TABLE ranks
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO ranks (name, min_bv, cap_multiplier, is_active)
VALUES
  ('No Rank', 0, 3, TRUE),
  ('Bronze', 1000, 4, TRUE),
  ('Silver', 5000, 5, TRUE),
  ('Gold', 15000, 6, TRUE),
  ('Diamond', 50000, 7, TRUE),
  ('Crown', 100000, 8, TRUE)
ON CONFLICT (name)
DO UPDATE SET
  min_bv = EXCLUDED.min_bv,
  cap_multiplier = EXCLUDED.cap_multiplier,
  is_active = TRUE;

UPDATE ranks
SET is_active = FALSE
WHERE name NOT IN ('No Rank', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Crown');

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_qualifying BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_pv_bv_ratio_check'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_pv_bv_ratio_check CHECK (pv = ROUND((bv * 0.4)::numeric, 2));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_pv_bv_ratio_check'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_pv_bv_ratio_check CHECK (pv = ROUND((bv * 0.4)::numeric, 2));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS weekly_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  UNIQUE (cycle_start, cycle_end),
  CHECK (cycle_end >= cycle_start)
);

CREATE TABLE IF NOT EXISTS weekly_user_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES weekly_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rank_id INT NOT NULL REFERENCES ranks(id),
  self_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  left_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  right_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  matched_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  matching_income_gross NUMERIC(14,2) NOT NULL DEFAULT 0,
  cap_multiplier NUMERIC(6,2) NOT NULL,
  cap_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  matching_income_net NUMERIC(14,2) NOT NULL DEFAULT 0,
  capped_overflow NUMERIC(14,2) NOT NULL DEFAULT 0,
  flushed_left_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  flushed_right_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  direct_income NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_user_summaries_user ON weekly_user_summaries(user_id);

CREATE TABLE IF NOT EXISTS monthly_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  UNIQUE (month_start, month_end),
  CHECK (month_end >= month_start)
);

CREATE TABLE IF NOT EXISTS monthly_user_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES monthly_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monthly_bv NUMERIC(14,2) NOT NULL DEFAULT 0,
  monthly_pv NUMERIC(14,2) NOT NULL DEFAULT 0,
  direct_income NUMERIC(14,2) NOT NULL DEFAULT 0,
  matching_income NUMERIC(14,2) NOT NULL DEFAULT 0,
  reward_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  reward_label VARCHAR(255),
  qualified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_user_summaries_user ON monthly_user_summaries(user_id);

CREATE TABLE IF NOT EXISTS monthly_reward_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES monthly_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monthly_bv NUMERIC(14,2) NOT NULL,
  threshold_bv NUMERIC(14,2) NOT NULL,
  reward_amount NUMERIC(14,2) NOT NULL,
  reward_label VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'qualified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_rewards_user ON monthly_reward_qualifications(user_id);
