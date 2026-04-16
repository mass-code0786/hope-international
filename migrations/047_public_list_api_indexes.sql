CREATE INDEX IF NOT EXISTS idx_products_created_at_desc
  ON products (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auctions_public_list_cover
  ON auctions (status, is_active, start_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_homepage_banners_active_created_at
  ON homepage_banners (is_active, created_at DESC);
