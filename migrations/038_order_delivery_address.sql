ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_address_id UUID NULL REFERENCES user_addresses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB NULL;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_address_id ON orders (delivery_address_id);
