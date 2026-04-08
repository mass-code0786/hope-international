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

async function listProducts(client, onlyActive = false) {
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
       created_at,
       updated_at
     FROM products
     WHERE ($1::boolean = false OR is_active = true)
     ORDER BY created_at DESC`,
    [onlyActive]
  );
  return rows;
}

async function findById(client, id) {
  const { rows } = await q(client).query('SELECT * FROM products WHERE id = $1', [id]);
  return rows[0] || null;
}

module.exports = {
  createProduct,
  listProducts,
  findById
};
