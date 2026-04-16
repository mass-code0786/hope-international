function q(client) {
  return client || require('../db/pool').pool;
}

function buildWhere(filters = {}) {
  const where = [];
  const values = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(title ILIKE $${values.length} OR COALESCE(subtitle, '') ILIKE $${values.length} OR COALESCE(cta_text, '') ILIKE $${values.length} OR COALESCE(target_link, '') ILIKE $${values.length})`);
  }

  if (filters.isActive === true || filters.isActive === false) {
    values.push(filters.isActive);
    where.push(`is_active = $${values.length}`);
  }

  return { where, values };
}

async function listAdminBanners(client, filters, pagination) {
  const built = buildWhere(filters);
  const whereSql = built.where.length ? `WHERE ${built.where.join(' AND ')}` : '';

  const listValues = [...built.values, pagination.limit, pagination.offset];
  const listSql = `SELECT *
                   FROM homepage_banners
                   ${whereSql}
                   ORDER BY sort_order ASC, created_at DESC
                   LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`;

  const countSql = `SELECT COUNT(*) FROM homepage_banners ${whereSql}`;

  const [listResult, countResult] = await Promise.all([
    q(client).query(listSql, listValues),
    q(client).query(countSql, built.values)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function listActiveBanners(client, limit = 5) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 20));
  const { rows } = await q(client).query(
    `SELECT
       id,
       image_url,
       title,
       subtitle,
       cta_text,
       target_link,
       sort_order,
       created_at,
       updated_at
     FROM homepage_banners
     WHERE is_active = true
       AND (start_at IS NULL OR start_at <= NOW())
       AND (end_at IS NULL OR end_at >= NOW())
     ORDER BY sort_order ASC, created_at DESC
     LIMIT $1`,
    [safeLimit]
  );
  return rows;
}

async function getBannerById(client, id) {
  const { rows } = await q(client).query('SELECT * FROM homepage_banners WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createBanner(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO homepage_banners (
      image_url,
      title,
      subtitle,
      cta_text,
      target_link,
      sort_order,
      is_active,
      start_at,
      end_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      payload.imageUrl,
      payload.title,
      payload.subtitle || null,
      payload.ctaText || null,
      payload.targetLink || null,
      payload.sortOrder ?? 0,
      payload.isActive ?? true,
      payload.startAt || null,
      payload.endAt || null
    ]
  );
  return rows[0];
}

async function updateBanner(client, id, payload) {
  const { rows } = await q(client).query(
    `UPDATE homepage_banners
     SET image_url = $2,
         title = $3,
         subtitle = $4,
         cta_text = $5,
         target_link = $6,
         sort_order = $7,
         is_active = $8,
         start_at = $9,
         end_at = $10
     WHERE id = $1
     RETURNING *`,
    [
      id,
      payload.imageUrl,
      payload.title,
      payload.subtitle || null,
      payload.ctaText || null,
      payload.targetLink || null,
      payload.sortOrder ?? 0,
      payload.isActive ?? true,
      payload.startAt || null,
      payload.endAt || null
    ]
  );

  return rows[0] || null;
}

async function deleteBanner(client, id) {
  const { rows } = await q(client).query('DELETE FROM homepage_banners WHERE id = $1 RETURNING *', [id]);
  return rows[0] || null;
}

module.exports = {
  listAdminBanners,
  listActiveBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner
};
