function q(client) {
  return client || require('../db/pool').pool;
}

function withPaging(limit = 20, offset = 0) {
  return {
    limit: Math.max(1, Number(limit) || 20),
    offset: Math.max(0, Number(offset) || 0)
  };
}

function normalizeRow(row) {
  if (!row) return null;
  return {
    ...row,
    is_read: Boolean(row.is_read),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  };
}

async function createNotification(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO user_notifications (user_id, type, title, message, route, is_read, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
     RETURNING *`,
    [
      payload.userId,
      payload.type,
      payload.title,
      payload.message,
      payload.route || null,
      Boolean(payload.isRead),
      payload.metadata || {},
      payload.createdAt || null
    ]
  );
  return normalizeRow(rows[0] || null);
}

async function createNotificationOnce(client, payload) {
  const sourceKey = String(payload.metadata?.sourceKey || '').trim();
  if (!sourceKey) {
    return createNotification(client, payload);
  }

  const { rows } = await q(client).query(
    `INSERT INTO user_notifications (user_id, type, title, message, route, is_read, metadata, created_at)
     SELECT $1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW())
     WHERE NOT EXISTS (
       SELECT 1
       FROM user_notifications
       WHERE user_id = $1
         AND metadata->>'sourceKey' = $9
     )
     RETURNING *`,
    [
      payload.userId,
      payload.type,
      payload.title,
      payload.message,
      payload.route || null,
      Boolean(payload.isRead),
      payload.metadata || {},
      payload.createdAt || null,
      sourceKey
    ]
  );

  if (rows[0]) return normalizeRow(rows[0]);

  const existing = await getNotificationBySourceKey(client, payload.userId, sourceKey);
  return normalizeRow(existing);
}

async function getNotificationBySourceKey(client, userId, sourceKey) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM user_notifications
     WHERE user_id = $1
       AND metadata->>'sourceKey' = $2
     LIMIT 1`,
    [userId, sourceKey]
  );
  return normalizeRow(rows[0] || null);
}

async function listUserNotifications(client, userId, pagination = {}) {
  const { limit, offset } = withPaging(pagination.limit, pagination.offset);
  const [listResult, countResult, summaryResult] = await Promise.all([
    q(client).query(
      `SELECT *
       FROM user_notifications
       WHERE user_id = $1
       ORDER BY is_read ASC, created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    q(client).query(
      `SELECT COUNT(*)
       FROM user_notifications
       WHERE user_id = $1`,
      [userId]
    ),
    q(client).query(
      `SELECT
         COUNT(*)::int AS total_count,
         COUNT(*) FILTER (WHERE is_read = false)::int AS unread_count,
         COUNT(*) FILTER (WHERE is_read = true)::int AS read_count
       FROM user_notifications
       WHERE user_id = $1`,
      [userId]
    )
  ]);

  return {
    items: listResult.rows.map(normalizeRow),
    total: Number(countResult.rows[0]?.count || 0),
    summary: summaryResult.rows[0] || { total_count: 0, unread_count: 0, read_count: 0 }
  };
}

async function getUnreadCount(client, userId) {
  const { rows } = await q(client).query(
    `SELECT COUNT(*)::int AS unread_count
     FROM user_notifications
     WHERE user_id = $1
       AND is_read = false`,
    [userId]
  );
  return Number(rows[0]?.unread_count || 0);
}

async function markAsRead(client, userId, notificationId) {
  const { rows } = await q(client).query(
    `UPDATE user_notifications
     SET is_read = true,
         updated_at = NOW()
     WHERE id = $1
       AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  return normalizeRow(rows[0] || null);
}

async function markAllAsRead(client, userId) {
  const { rows } = await q(client).query(
    `WITH updated AS (
       UPDATE user_notifications
       SET is_read = true,
           updated_at = NOW()
       WHERE user_id = $1
         AND is_read = false
       RETURNING id
     )
     SELECT COUNT(*)::int AS updated_count
     FROM updated`,
    [userId]
  );
  return Number(rows[0]?.updated_count || 0);
}

module.exports = {
  createNotification,
  createNotificationOnce,
  getNotificationBySourceKey,
  listUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
