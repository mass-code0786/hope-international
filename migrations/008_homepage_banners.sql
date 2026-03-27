CREATE TABLE IF NOT EXISTS homepage_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(500),
  cta_text VARCHAR(80),
  target_link VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT homepage_banners_date_window CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at)
);

CREATE INDEX IF NOT EXISTS idx_homepage_banners_active ON homepage_banners (is_active, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_homepage_banners_dates ON homepage_banners (start_at, end_at);

DROP TRIGGER IF EXISTS trg_homepage_banners_updated_at ON homepage_banners;
CREATE TRIGGER trg_homepage_banners_updated_at
BEFORE UPDATE ON homepage_banners
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
