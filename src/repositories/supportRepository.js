function q(client) {
  return client || require('../db/pool').pool;
}

function buildFilters(filters = {}, values = [], options = {}) {
  const where = [];

  if (options.userId) {
    values.push(options.userId);
    where.push(`st.user_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    where.push(`st.status = $${values.length}`);
  }

  if (filters.category) {
    values.push(filters.category);
    where.push(`st.category = $${values.length}`);
  }

  if (filters.userId) {
    values.push(filters.userId);
    where.push(`st.user_id = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(
      st.subject ILIKE $${values.length}
      OR COALESCE(last_message.message, '') ILIKE $${values.length}
      OR u.username ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
      OR CAST(st.id AS TEXT) ILIKE $${values.length}
    )`);
  }

  if (filters.dateFrom) {
    values.push(filters.dateFrom);
    where.push(`st.created_at >= $${values.length}::date`);
  }

  if (filters.dateTo) {
    values.push(filters.dateTo);
    where.push(`st.created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  return where;
}

async function listThreads(client, filters = {}, pagination = {}, options = {}) {
  const values = [];
  const where = buildFilters(filters, values, options);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  values.push(pagination.limit, pagination.offset);
  const listSql = `
    SELECT
      st.*,
      u.username,
      u.email,
      u.first_name,
      u.last_name,
      last_message.message AS last_message,
      last_message.sender_type AS last_sender_type,
      last_message.created_at AS last_message_at,
      COALESCE(message_counts.message_count, 0)::int AS message_count
    FROM support_threads st
    JOIN users u ON u.id = st.user_id
    LEFT JOIN LATERAL (
      SELECT sm.message, sm.sender_type, sm.created_at
      FROM support_messages sm
      WHERE sm.thread_id = st.id
      ORDER BY sm.created_at DESC
      LIMIT 1
    ) last_message ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS message_count
      FROM support_messages smc
      WHERE smc.thread_id = st.id
    ) message_counts ON TRUE
    ${whereSql}
    ORDER BY st.updated_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `;

  const countSql = `
    SELECT COUNT(*)
    FROM support_threads st
    JOIN users u ON u.id = st.user_id
    LEFT JOIN LATERAL (
      SELECT sm.message
      FROM support_messages sm
      WHERE sm.thread_id = st.id
      ORDER BY sm.created_at DESC
      LIMIT 1
    ) last_message ON TRUE
    ${whereSql}
  `;
  const countValues = values.slice(0, values.length - 2);

  const [listResult, countResult] = await Promise.all([
    q(client).query(listSql, values),
    q(client).query(countSql, countValues)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getThreadById(client, threadId) {
  const { rows } = await q(client).query(
    `SELECT
      st.*,
      u.username,
      u.email,
      u.first_name,
      u.last_name,
      closer.username AS closed_by_username
     FROM support_threads st
     JOIN users u ON u.id = st.user_id
     LEFT JOIN users closer ON closer.id = st.closed_by
     WHERE st.id = $1`,
    [threadId]
  );
  return rows[0] || null;
}

async function getThreadByIdForUser(client, threadId, userId) {
  const { rows } = await q(client).query(
    `SELECT
      st.*,
      u.username,
      u.email,
      u.first_name,
      u.last_name,
      closer.username AS closed_by_username
     FROM support_threads st
     JOIN users u ON u.id = st.user_id
     LEFT JOIN users closer ON closer.id = st.closed_by
     WHERE st.id = $1
       AND st.user_id = $2`,
    [threadId, userId]
  );
  return rows[0] || null;
}

async function createThread(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO support_threads (user_id, subject, category, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [payload.userId, payload.subject, payload.category, payload.status || 'open']
  );
  return rows[0] || null;
}

async function updateThread(client, threadId, payload) {
  const { rows } = await q(client).query(
    `UPDATE support_threads
     SET subject = $2,
         category = $3,
         status = $4,
         updated_at = NOW(),
         closed_at = $5,
         closed_by = $6
     WHERE id = $1
     RETURNING *`,
    [threadId, payload.subject, payload.category, payload.status, payload.closedAt || null, payload.closedBy || null]
  );
  return rows[0] || null;
}

async function touchThread(client, threadId, status) {
  const values = [threadId, status];
  const { rows } = await q(client).query(
    `UPDATE support_threads
     SET status = $2,
         updated_at = NOW(),
         closed_at = CASE WHEN $2 = 'closed' THEN COALESCE(closed_at, NOW()) ELSE NULL END,
         closed_by = CASE WHEN $2 = 'closed' THEN closed_by ELSE NULL END
     WHERE id = $1
     RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function setThreadStatus(client, threadId, payload) {
  const { rows } = await q(client).query(
    `UPDATE support_threads
     SET status = $2,
         updated_at = NOW(),
         closed_at = $3,
         closed_by = $4
     WHERE id = $1
     RETURNING *`,
    [threadId, payload.status, payload.closedAt || null, payload.closedBy || null]
  );
  return rows[0] || null;
}

async function createMessage(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO support_messages (thread_id, sender_type, sender_user_id, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [payload.threadId, payload.senderType, payload.senderUserId || null, payload.message]
  );
  return rows[0] || null;
}

async function listMessagesByThreadId(client, threadId) {
  const { rows } = await q(client).query(
    `SELECT
      sm.*,
      sender.username AS sender_username,
      sender.first_name AS sender_first_name,
      sender.last_name AS sender_last_name,
      sender.email AS sender_email
     FROM support_messages sm
     LEFT JOIN users sender ON sender.id = sm.sender_user_id
     WHERE sm.thread_id = $1
     ORDER BY sm.created_at ASC`,
    [threadId]
  );
  return rows;
}

async function getThreadSummary(client, options = {}) {
  const values = [];
  const where = [];

  if (options.userId) {
    values.push(options.userId);
    where.push(`user_id = $${values.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(client).query(
    `SELECT
      COUNT(*)::int AS total_threads,
      COUNT(*) FILTER (WHERE status = 'open')::int AS open_threads,
      COUNT(*) FILTER (WHERE status = 'replied')::int AS replied_threads,
      COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_threads
     FROM support_threads
     ${whereSql}`,
    values
  );
  return rows[0] || { total_threads: 0, open_threads: 0, replied_threads: 0, closed_threads: 0 };
}

module.exports = {
  listThreads,
  getThreadById,
  getThreadByIdForUser,
  createThread,
  updateThread,
  touchThread,
  setThreadStatus,
  createMessage,
  listMessagesByThreadId,
  getThreadSummary
};
