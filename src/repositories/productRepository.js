function q(client) {
  return client || require('../db/pool').pool;
}

async function createProduct(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO products (sku, name, description, category, price, pv, bv, is_active, is_qualifying, image_url, gallery)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      payload.sku,
      payload.name,
      payload.description || null,
      payload.category || 'General',
      payload.price,
      payload.pv,
      payload.bv,
      payload.isActive ?? true,
      payload.isQualifying ?? true,
      payload.imageUrl || null,
      JSON.stringify(Array.isArray(payload.gallery) ? payload.gallery : [])
    ]
  );
  return rows[0];
}

async function listProducts(client, { onlyActive = false, category, limit = 20, offset = 0, includeTotal = true, view = 'card' } = {}) {
  const safeLimit = Math.max(1, Number(limit) || 20);
  const safeOffset = Math.max(0, Number(offset) || 0);
  const normalizedCategory = String(category || '').trim().toLowerCase();
  const pool = q(client);
  const listColumns = view === 'full'
    ? `id,
       sku,
       name,
       description,
       category,
       price,
       pv,
       bv,
       is_active,
       is_qualifying,
       image_url,
       gallery,
       seller_profile_id,
       moderation_status,
       created_at,
       updated_at`
    : `id,
       name,
       name AS title,
       id::text AS slug,
       category,
       price,
       NULL::numeric AS sale_price,
       COALESCE(image_url, gallery->>0) AS image_url,
       COALESCE(image_url, gallery->>0) AS primary_image,
       COALESCE(image_url, gallery->>0) AS thumbnail_url,
       is_active,
       is_active AS is_available,
       NULL::integer AS stock,
       is_qualifying,
       CASE WHEN is_qualifying THEN 'Featured' ELSE NULL END AS badge,
       NULL::numeric(3,2) AS rating`;
  const listResult = await pool.query(
    `SELECT ${listColumns}
     FROM products
     WHERE ($1::boolean = false OR is_active = true)
       AND ($2::text = '' OR LOWER(COALESCE(category, '')) = $2::text)
     ORDER BY created_at DESC, id DESC
     LIMIT $3 OFFSET $4`,
    [onlyActive, normalizedCategory, includeTotal ? safeLimit : safeLimit + 1, safeOffset]
  );

  let total = null;
  if (includeTotal) {
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM products
       WHERE ($1::boolean = false OR is_active = true)
         AND ($2::text = '' OR LOWER(COALESCE(category, '')) = $2::text)`,
      [onlyActive, normalizedCategory]
    );
    total = Number(countResult.rows[0]?.total || 0);
  }

  const hasMore = !includeTotal && listResult.rows.length > safeLimit;
  const items = includeTotal ? listResult.rows : listResult.rows.slice(0, safeLimit);

  return {
    items,
    total,
    hasMore
  };
}

async function findById(client, id) {
  const { rows } = await q(client).query(
    `SELECT
       id,
       sku,
       name,
       description,
       category,
       price,
       pv,
       bv,
       is_active,
       is_qualifying,
       image_url,
       gallery,
       seller_profile_id,
       moderation_status,
       moderation_notes,
       created_at,
       updated_at
     FROM products
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  createProduct,
  listProducts,
  findById
};
