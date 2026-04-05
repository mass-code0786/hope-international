CREATE TABLE IF NOT EXISTS landing_media_assets (
  slot_key VARCHAR(80) PRIMARY KEY,
  image_url TEXT NULL,
  alt_text VARCHAR(255) NULL,
  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_media_assets_updated_at ON landing_media_assets(updated_at DESC);

DROP TRIGGER IF EXISTS trg_landing_media_assets_updated_at ON landing_media_assets;
CREATE TRIGGER trg_landing_media_assets_updated_at
BEFORE UPDATE ON landing_media_assets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
