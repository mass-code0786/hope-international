DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    BEGIN
      ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'replaced';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'returned';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_settlement_status') THEN
    CREATE TYPE order_settlement_status AS ENUM ('pending', 'settled', 'reversed');
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seller_earning_status') THEN
    BEGIN
      ALTER TYPE seller_earning_status ADD VALUE IF NOT EXISTS 'finalized';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS replacement_window_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 day'),
  ADD COLUMN IF NOT EXISTS settlement_status order_settlement_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settlement_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settlement_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_settlement_pending
  ON orders (settlement_status, replacement_window_ends_at);

CREATE INDEX IF NOT EXISTS idx_orders_settled_at
  ON orders (settled_at DESC);

ALTER TABLE seller_earnings_ledger
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(6,4) NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS platform_margin_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (platform_margin_amount >= 0),
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_seller_earnings_order_id ON seller_earnings_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_settled_at ON seller_earnings_ledger(settled_at DESC);

CREATE TABLE IF NOT EXISTS order_settlement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status order_settlement_status,
  next_status order_settlement_status NOT NULL,
  actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_settlement_events_order_id ON order_settlement_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_settlement_events_created_at ON order_settlement_events(created_at DESC);
