function q(client) {
  return client || require('../db/pool').pool;
}

async function listGalleryItems(client, { onlyVisible = false } = {}) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM gallery_items
     ${onlyVisible ? 'WHERE is_visible = TRUE' : ''}
     ORDER BY sort_order ASC, created_at DESC`
  );
  return rows;
}

async function getGalleryItemById(client, id) {
  const { rows } = await q(client).query('SELECT * FROM gallery_items WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createGalleryItem(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO gallery_items (
      title,
      caption,
      image_url,
      is_visible,
      sort_order,
      created_by,
      updated_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      payload.title || null,
      payload.caption || null,
      payload.imageUrl,
      payload.isVisible ?? true,
      payload.sortOrder ?? 0,
      payload.createdBy || null,
      payload.updatedBy || null
    ]
  );
  return rows[0] || null;
}

async function updateGalleryItem(client, id, payload) {
  const { rows } = await q(client).query(
    `UPDATE gallery_items
     SET title = $2,
         caption = $3,
         image_url = $4,
         is_visible = $5,
         sort_order = $6,
         updated_by = $7
     WHERE id = $1
     RETURNING *`,
    [
      id,
      payload.title || null,
      payload.caption || null,
      payload.imageUrl,
      payload.isVisible ?? true,
      payload.sortOrder ?? 0,
      payload.updatedBy || null
    ]
  );
  return rows[0] || null;
}

async function deleteGalleryItem(client, id) {
  const { rows } = await q(client).query('DELETE FROM gallery_items WHERE id = $1 RETURNING *', [id]);
  return rows[0] || null;
}

module.exports = {
  listGalleryItems,
  getGalleryItemById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem
};
