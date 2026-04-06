CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(160) NULL,
  caption TEXT NULL,
  image_url TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_items_visible_sort ON gallery_items (is_visible, sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_items_created_at ON gallery_items (created_at DESC);

DROP TRIGGER IF EXISTS trg_gallery_items_updated_at ON gallery_items;
CREATE TRIGGER trg_gallery_items_updated_at
BEFORE UPDATE ON gallery_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
