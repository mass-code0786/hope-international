CREATE TABLE IF NOT EXISTS landing_page_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  hero_badge VARCHAR(80) NOT NULL DEFAULT 'Hope International',
  hero_headline VARCHAR(255) NOT NULL DEFAULT 'Products, offers, and updates in one place.',
  hero_subheadline VARCHAR(500) NOT NULL DEFAULT 'Browse featured products, see what Hope International offers, and create an account when you are ready.',
  hero_primary_cta_text VARCHAR(80) NOT NULL DEFAULT 'Create account',
  hero_secondary_cta_text VARCHAR(80) NOT NULL DEFAULT 'Login',
  hero_image_url TEXT NULL,
  hero_background_note VARCHAR(120) NOT NULL DEFAULT 'Available across multiple countries',
  featured_section_title VARCHAR(120) NOT NULL DEFAULT 'Featured products',
  benefits_section_title VARCHAR(120) NOT NULL DEFAULT 'Why choose Hope',
  details_section_title VARCHAR(120) NOT NULL DEFAULT 'More to explore',
  testimonials_section_title VARCHAR(120) NOT NULL DEFAULT 'What members say',
  stats_section_title VARCHAR(120) NOT NULL DEFAULT 'At a glance',
  countries_section_title VARCHAR(120) NOT NULL DEFAULT 'Serving members globally',
  footer_support_text VARCHAR(200) NOT NULL DEFAULT 'Need help getting started? Contact the Hope International support team.',
  footer_contact_email VARCHAR(255) NOT NULL DEFAULT 'support@hopeinternational.local',
  section_order JSONB NOT NULL DEFAULT '["hero","featured","benefits","details","testimonials","stats","countries","footer"]'::jsonb,
  section_visibility JSONB NOT NULL DEFAULT '{"hero":true,"featured":true,"benefits":true,"details":true,"testimonials":true,"stats":true,"countries":true,"footer":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS landing_page_stats (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  total_visitors BIGINT NOT NULL DEFAULT 0,
  total_visitors_override BIGINT NULL,
  total_reviews_override BIGINT NULL,
  total_members_override BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS landing_featured_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NULL REFERENCES products(id) ON DELETE SET NULL,
  title VARCHAR(255) NULL,
  description VARCHAR(1000) NULL,
  image_url TEXT NULL,
  price_label VARCHAR(120) NULL,
  promo_text VARCHAR(120) NULL,
  cta_text VARCHAR(80) NULL,
  target_link VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS landing_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) NULL,
  body_text TEXT NULL,
  image_url TEXT NULL,
  icon_name VARCHAR(60) NULL,
  accent_label VARCHAR(120) NULL,
  cta_text VARCHAR(80) NULL,
  target_link VARCHAR(500) NULL,
  layout_style VARCHAR(30) NOT NULL DEFAULT 'icon-card',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT landing_content_blocks_section_key_check CHECK (section_key IN ('benefits', 'details')),
  CONSTRAINT landing_content_blocks_layout_style_check CHECK (layout_style IN ('icon-card', 'image-left', 'image-right'))
);

CREATE TABLE IF NOT EXISTS landing_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name VARCHAR(160) NOT NULL,
  reviewer_role VARCHAR(160) NULL,
  review_text TEXT NOT NULL,
  rating INT NOT NULL DEFAULT 5,
  avatar_url TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT landing_testimonials_rating_check CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS landing_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(8) NOT NULL,
  country_name VARCHAR(80) NOT NULL,
  flag_emoji VARCHAR(12) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS landing_page_visitors (
  visitor_token_hash VARCHAR(64) PRIMARY KEY,
  visit_count INT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_counted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landing_featured_items_active ON landing_featured_items (is_active, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_content_blocks_section ON landing_content_blocks (section_key, is_active, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_testimonials_active ON landing_testimonials (is_active, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_countries_active ON landing_countries (is_active, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_visitors_last_counted ON landing_page_visitors (last_counted_at DESC);

DROP TRIGGER IF EXISTS trg_landing_page_settings_updated_at ON landing_page_settings;
CREATE TRIGGER trg_landing_page_settings_updated_at
BEFORE UPDATE ON landing_page_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_landing_page_stats_updated_at ON landing_page_stats;
CREATE TRIGGER trg_landing_page_stats_updated_at
BEFORE UPDATE ON landing_page_stats
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_landing_featured_items_updated_at ON landing_featured_items;
CREATE TRIGGER trg_landing_featured_items_updated_at
BEFORE UPDATE ON landing_featured_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_landing_content_blocks_updated_at ON landing_content_blocks;
CREATE TRIGGER trg_landing_content_blocks_updated_at
BEFORE UPDATE ON landing_content_blocks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_landing_testimonials_updated_at ON landing_testimonials;
CREATE TRIGGER trg_landing_testimonials_updated_at
BEFORE UPDATE ON landing_testimonials
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_landing_countries_updated_at ON landing_countries;
CREATE TRIGGER trg_landing_countries_updated_at
BEFORE UPDATE ON landing_countries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO landing_page_settings (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO landing_page_stats (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO landing_featured_items (title, description, image_url, price_label, promo_text, cta_text, target_link, sort_order, is_active)
SELECT 'Hope Starter Pack', 'A simple way for new members to explore the platform and get started.', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80', 'Getting started', 'Popular', 'Join now', '/register', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM landing_featured_items WHERE title = 'Hope Starter Pack');

INSERT INTO landing_featured_items (title, description, image_url, price_label, promo_text, cta_text, target_link, sort_order, is_active)
SELECT 'Seller Tools', 'A closer look at product visibility, seller access, and growth tools on Hope International.', 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80', 'For sellers', 'New', 'Explore', '/register', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM landing_featured_items WHERE title = 'Seller Tools');

INSERT INTO landing_featured_items (title, description, image_url, price_label, promo_text, cta_text, target_link, sort_order, is_active)
SELECT 'Member Highlights', 'Browse selected products, offers, and updates before creating your account.', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80', 'Featured', 'Updated', 'View highlights', '#details', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM landing_featured_items WHERE title = 'Member Highlights');

INSERT INTO landing_content_blocks (section_key, title, subtitle, body_text, icon_name, accent_label, layout_style, sort_order, is_active)
SELECT 'benefits', 'Secure shopping', 'Protected access', 'Browse products and sign in through a secure member account system.', 'shield-check', 'Security', 'icon-card', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM landing_content_blocks WHERE section_key = 'benefits' AND title = 'Secure shopping');

INSERT INTO landing_content_blocks (section_key, title, subtitle, body_text, icon_name, accent_label, layout_style, sort_order, is_active)
SELECT 'benefits', 'Global access', 'Multiple countries', 'Hope International supports members across growing regions and markets.', 'globe-2', 'Global', 'icon-card', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM landing_content_blocks WHERE section_key = 'benefits' AND title = 'Global access');

INSERT INTO landing_content_blocks (section_key, title, subtitle, body_text, icon_name, accent_label, layout_style, sort_order, is_active)
SELECT 'benefits', 'Seller opportunities', 'Commerce tools', 'See product updates, seller options, and useful highlights in one place.', 'sparkles', 'Seller', 'icon-card', 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM landing_content_blocks WHERE section_key = 'benefits' AND title = 'Seller opportunities');

INSERT INTO landing_content_blocks (section_key, title, subtitle, body_text, image_url, accent_label, cta_text, target_link, layout_style, sort_order, is_active)
SELECT 'details', 'Product highlights', 'Featured items and offers', 'Use this space to show important product details, current offers, and useful updates for visitors.', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80', 'Products', 'Create account', '/register', 'image-right', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM landing_content_blocks WHERE section_key = 'details' AND title = 'Product highlights');

INSERT INTO landing_content_blocks (section_key, title, subtitle, body_text, image_url, accent_label, cta_text, target_link, layout_style, sort_order, is_active)
SELECT 'details', 'Business updates', 'For members and sellers', 'Share simple updates about member benefits, seller tools, and new opportunities.', 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80', 'Updates', 'Login', '/login', 'image-left', 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM landing_content_blocks WHERE section_key = 'details' AND title = 'Business updates');

INSERT INTO landing_testimonials (reviewer_name, reviewer_role, review_text, rating, sort_order, is_active)
SELECT 'Amara Joseph', 'Member', 'The site is easy to understand and makes it simple to get started.', 5, 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM landing_testimonials WHERE reviewer_name = 'Amara Joseph');

INSERT INTO landing_testimonials (reviewer_name, reviewer_role, review_text, rating, sort_order, is_active)
SELECT 'Daniel Mensah', 'Seller', 'I can quickly see the products and seller information I need.', 5, 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM landing_testimonials WHERE reviewer_name = 'Daniel Mensah');

INSERT INTO landing_testimonials (reviewer_name, reviewer_role, review_text, rating, sort_order, is_active)
SELECT 'Grace Bello', 'Community lead', 'The public homepage feels clean, clear, and easier for new visitors.', 4, 3, TRUE
WHERE NOT EXISTS (SELECT 1 FROM landing_testimonials WHERE reviewer_name = 'Grace Bello');

INSERT INTO landing_countries (country_code, country_name, flag_emoji, sort_order, is_active)
SELECT code, name, '', sort_order, TRUE
FROM (VALUES
  ('NG', 'Nigeria', 1),
  ('GH', 'Ghana', 2),
  ('KE', 'Kenya', 3),
  ('IN', 'India', 4),
  ('AE', 'United Arab Emirates', 5),
  ('GB', 'United Kingdom', 6),
  ('US', 'United States', 7),
  ('CA', 'Canada', 8),
  ('ZA', 'South Africa', 9),
  ('SG', 'Singapore', 10)
) AS seed(code, name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM landing_countries existing WHERE existing.country_code = seed.code);
