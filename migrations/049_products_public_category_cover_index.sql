CREATE INDEX IF NOT EXISTS idx_products_public_active_category_created_at
  ON products (is_active, LOWER(COALESCE(category, '')), created_at DESC);
