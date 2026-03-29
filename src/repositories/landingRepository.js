function q(client) {
  return client || require('../db/pool').pool;
}

const DEFAULT_SECTION_ORDER = ['hero', 'featured', 'benefits', 'details', 'testimonials', 'stats', 'countries', 'footer'];
const DEFAULT_SECTION_VISIBILITY = {
  hero: true,
  featured: true,
  benefits: true,
  details: true,
  testimonials: true,
  stats: true,
  countries: true,
  footer: true
};

async function ensureSingletonRows(client) {
  await q(client).query('INSERT INTO landing_page_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING');
  await q(client).query('INSERT INTO landing_page_stats (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING');
}

async function getSettings(client) {
  const { rows } = await q(client).query('SELECT * FROM landing_page_settings WHERE id = TRUE');
  return rows[0] || null;
}

async function updateSettings(client, payload) {
  const { rows } = await q(client).query(
    `UPDATE landing_page_settings
     SET hero_badge = $1,
         hero_headline = $2,
         hero_subheadline = $3,
         hero_primary_cta_text = $4,
         hero_secondary_cta_text = $5,
         hero_image_url = $6,
         hero_background_note = $7,
         featured_section_title = $8,
         benefits_section_title = $9,
         details_section_title = $10,
         testimonials_section_title = $11,
         stats_section_title = $12,
         countries_section_title = $13,
         footer_support_text = $14,
         footer_contact_email = $15,
         section_order = $16,
         section_visibility = $17
     WHERE id = TRUE
     RETURNING *`,
    [
      payload.heroBadge,
      payload.heroHeadline,
      payload.heroSubheadline,
      payload.heroPrimaryCtaText,
      payload.heroSecondaryCtaText,
      payload.heroImageUrl || null,
      payload.heroBackgroundNote,
      payload.featuredSectionTitle,
      payload.benefitsSectionTitle,
      payload.detailsSectionTitle,
      payload.testimonialsSectionTitle,
      payload.statsSectionTitle,
      payload.countriesSectionTitle,
      payload.footerSupportText,
      payload.footerContactEmail,
      JSON.stringify(Array.isArray(payload.sectionOrder) ? payload.sectionOrder : DEFAULT_SECTION_ORDER),
      JSON.stringify(payload.sectionVisibility || DEFAULT_SECTION_VISIBILITY)
    ]
  );
  return rows[0] || null;
}

async function getStats(client) {
  const { rows } = await q(client).query('SELECT * FROM landing_page_stats WHERE id = TRUE');
  return rows[0] || null;
}

async function updateStats(client, payload) {
  const { rows } = await q(client).query(
    `UPDATE landing_page_stats
     SET total_visitors = $1,
         total_visitors_override = $2,
         total_reviews_override = $3,
         total_members_override = $4
     WHERE id = TRUE
     RETURNING *`,
    [
      payload.totalVisitors ?? 0,
      payload.totalVisitorsOverride ?? null,
      payload.totalReviewsOverride ?? null,
      payload.totalMembersOverride ?? null
    ]
  );
  return rows[0] || null;
}

async function listFeaturedItems(client, { onlyActive = false } = {}) {
  const { rows } = await q(client).query(
    `SELECT fi.*, 
            p.name AS product_name,
            p.description AS product_description,
            p.price AS product_price,
            p.image_url AS product_image_url,
            p.category AS product_category,
            p.is_active AS linked_product_is_active
     FROM landing_featured_items fi
     LEFT JOIN products p ON p.id = fi.product_id
     ${onlyActive ? 'WHERE fi.is_active = TRUE' : ''}
     ORDER BY fi.sort_order ASC, fi.created_at DESC`
  );
  return rows;
}

async function getFeaturedItemById(client, id) {
  const { rows } = await q(client).query('SELECT * FROM landing_featured_items WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createFeaturedItem(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO landing_featured_items (
      product_id,
      title,
      description,
      image_url,
      price_label,
      promo_text,
      cta_text,
      target_link,
      sort_order,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      payload.productId || null,
      payload.title || null,
      payload.description || null,
      payload.imageUrl || null,
      payload.priceLabel || null,
      payload.promoText || null,
      payload.ctaText || null,
      payload.targetLink || null,
      payload.sortOrder ?? 0,
      payload.isActive ?? true
    ]
  );
  return rows[0];
}

async function updateFeaturedItem(client, id, payload) {
  const { rows } = await q(client).query(
    `UPDATE landing_featured_items
     SET product_id = $2,
         title = $3,
         description = $4,
         image_url = $5,
         price_label = $6,
         promo_text = $7,
         cta_text = $8,
         target_link = $9,
         sort_order = $10,
         is_active = $11
     WHERE id = $1
     RETURNING *`,
    [
      id,
      payload.productId || null,
      payload.title || null,
      payload.description || null,
      payload.imageUrl || null,
      payload.priceLabel || null,
      payload.promoText || null,
      payload.ctaText || null,
      payload.targetLink || null,
      payload.sortOrder ?? 0,
      payload.isActive ?? true
    ]
  );
  return rows[0] || null;
}

async function deleteFeaturedItem(client, id) {
  const { rows } = await q(client).query('DELETE FROM landing_featured_items WHERE id = $1 RETURNING *', [id]);
  return rows[0] || null;
}

async function listContentBlocks(client, { sectionKey, onlyActive = false } = {}) {
  const values = [];
  const where = [];

  if (sectionKey) {
    values.push(sectionKey);
    where.push(`section_key = $${values.length}`);
  }

  if (onlyActive) {
    where.push('is_active = TRUE');
  }

  const { rows } = await q(client).query(
    `SELECT *
     FROM landing_content_blocks
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY sort_order ASC, created_at DESC`,
    values
  );
  return rows;
}

async function getContentBlockById(client, id) {
  const { rows } = await q(client).query('SELECT * FROM landing_content_blocks WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createContentBlock(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO landing_content_blocks (
      section_key,
      title,
      subtitle,
      body_text,
      image_url,
      icon_name,
      accent_label,
      cta_text,
      target_link,
      layout_style,
      sort_order,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      payload.sectionKey,
      payload.title,
      payload.subtitle || null,
      payload.bodyText || null,
      payload.imageUrl || null,
      payload.iconName || null,
      payload.accentLabel || null,
      payload.ctaText || null,
      payload.targetLink || null,
      payload.layoutStyle || 'icon-card',
      payload.sortOrder ?? 0,
      payload.isActive ?? true
    ]
  );
  return rows[0];
}

async function updateContentBlock(client, id, payload) {
  const { rows } = await q(client).query(
    `UPDATE landing_content_blocks
     SET section_key = $2,
         title = $3,
         subtitle = $4,
         body_text = $5,
         image_url = $6,
         icon_name = $7,
         accent_label = $8,
         cta_text = $9,
         target_link = $10,
         layout_style = $11,
         sort_order = $12,
         is_active = $13
     WHERE id = $1
     RETURNING *`,
    [
      id,
      payload.sectionKey,
      payload.title,
      payload.subtitle || null,
      payload.bodyText || null,
      payload.imageUrl || null,
      payload.iconName || null,
      payload.accentLabel || null,
      payload.ctaText || null,
      payload.targetLink || null,
      payload.layoutStyle || 'icon-card',
      payload.sortOrder ?? 0,
      payload.isActive ?? true
    ]
  );
  return rows[0] || null;
}

async function deleteContentBlock(client, id) {
  const { rows } = await q(client).query('DELETE FROM landing_content_blocks WHERE id = $1 RETURNING *', [id]);
  return rows[0] || null;
}

async function listTestimonials(client, { onlyActive = false } = {}) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM landing_testimonials
     ${onlyActive ? 'WHERE is_active = TRUE' : ''}
     ORDER BY sort_order ASC, created_at DESC`
  );
  return rows;
}

async function getTestimonialById(client, id) {
  const { rows } = await q(client).query('SELECT * FROM landing_testimonials WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createTestimonial(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO landing_testimonials (
      reviewer_name,
      reviewer_role,
      review_text,
      rating,
      avatar_url,
      sort_order,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      payload.reviewerName,
      payload.reviewerRole || null,
      payload.reviewText,
      payload.rating ?? 5,
      payload.avatarUrl || null,
      payload.sortOrder ?? 0,
      payload.isActive ?? true
    ]
  );
  return rows[0];
}

async function updateTestimonial(client, id, payload) {
  const { rows } = await q(client).query(
    `UPDATE landing_testimonials
     SET reviewer_name = $2,
         reviewer_role = $3,
         review_text = $4,
         rating = $5,
         avatar_url = $6,
         sort_order = $7,
         is_active = $8
     WHERE id = $1
     RETURNING *`,
    [
      id,
      payload.reviewerName,
      payload.reviewerRole || null,
      payload.reviewText,
      payload.rating ?? 5,
      payload.avatarUrl || null,
      payload.sortOrder ?? 0,
      payload.isActive ?? true
    ]
  );
  return rows[0] || null;
}

async function deleteTestimonial(client, id) {
  const { rows } = await q(client).query('DELETE FROM landing_testimonials WHERE id = $1 RETURNING *', [id]);
  return rows[0] || null;
}

async function listCountries(client, { onlyActive = false } = {}) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM landing_countries
     ${onlyActive ? 'WHERE is_active = TRUE' : ''}
     ORDER BY sort_order ASC, created_at DESC`
  );
  return rows;
}

async function getCountryById(client, id) {
  const { rows } = await q(client).query('SELECT * FROM landing_countries WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createCountry(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO landing_countries (
      country_code,
      country_name,
      flag_emoji,
      sort_order,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      String(payload.countryCode || '').toUpperCase(),
      payload.countryName,
      payload.flagEmoji,
      payload.sortOrder ?? 0,
      payload.isActive ?? true
    ]
  );
  return rows[0];
}

async function updateCountry(client, id, payload) {
  const { rows } = await q(client).query(
    `UPDATE landing_countries
     SET country_code = $2,
         country_name = $3,
         flag_emoji = $4,
         sort_order = $5,
         is_active = $6
     WHERE id = $1
     RETURNING *`,
    [
      id,
      String(payload.countryCode || '').toUpperCase(),
      payload.countryName,
      payload.flagEmoji,
      payload.sortOrder ?? 0,
      payload.isActive ?? true
    ]
  );
  return rows[0] || null;
}

async function deleteCountry(client, id) {
  const { rows } = await q(client).query('DELETE FROM landing_countries WHERE id = $1 RETURNING *', [id]);
  return rows[0] || null;
}

async function countRegisteredMembers(client) {
  const { rows } = await q(client).query('SELECT COUNT(*)::bigint AS count FROM users');
  return Number(rows[0]?.count || 0);
}

async function countActiveTestimonials(client) {
  const { rows } = await q(client).query('SELECT COUNT(*)::bigint AS count FROM landing_testimonials WHERE is_active = TRUE');
  return Number(rows[0]?.count || 0);
}

async function trackVisitor(client, visitorTokenHash) {
  const existingResult = await q(client).query(
    'SELECT * FROM landing_page_visitors WHERE visitor_token_hash = $1',
    [visitorTokenHash]
  );
  const existing = existingResult.rows[0] || null;

  let counted = false;

  if (!existing) {
    await q(client).query(
      `INSERT INTO landing_page_visitors (
        visitor_token_hash,
        visit_count,
        first_seen_at,
        last_seen_at,
        last_counted_at
      )
      VALUES ($1, 1, NOW(), NOW(), NOW())`,
      [visitorTokenHash]
    );
    counted = true;
  } else {
    const countWindowOpen = !existing.last_counted_at || new Date(existing.last_counted_at).getTime() <= (Date.now() - 24 * 60 * 60 * 1000);

    await q(client).query(
      `UPDATE landing_page_visitors
       SET visit_count = CASE WHEN $2 THEN visit_count + 1 ELSE visit_count END,
           last_seen_at = NOW(),
           last_counted_at = CASE WHEN $2 THEN NOW() ELSE last_counted_at END
       WHERE visitor_token_hash = $1`,
      [visitorTokenHash, countWindowOpen]
    );

    counted = countWindowOpen;
  }

  if (counted) {
    await q(client).query(
      `UPDATE landing_page_stats
       SET total_visitors = total_visitors + 1
       WHERE id = TRUE`
    );
  }

  return getStats(client);
}

module.exports = {
  DEFAULT_SECTION_ORDER,
  DEFAULT_SECTION_VISIBILITY,
  ensureSingletonRows,
  getSettings,
  updateSettings,
  getStats,
  updateStats,
  listFeaturedItems,
  getFeaturedItemById,
  createFeaturedItem,
  updateFeaturedItem,
  deleteFeaturedItem,
  listContentBlocks,
  getContentBlockById,
  createContentBlock,
  updateContentBlock,
  deleteContentBlock,
  listTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  listCountries,
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry,
  countRegisteredMembers,
  countActiveTestimonials,
  trackVisitor
};
