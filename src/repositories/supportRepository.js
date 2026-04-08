function q(client) {
  return client || require('../db/pool').pool;
}

const { getCacheEntry, setCacheEntry } = require('../utils/runtimeCache');

async function tableExists(client, tableName) {
  const cacheKey = `support-repo:exists:${tableName}`;
  const cached = getCacheEntry(cacheKey);
  if (cached !== null) return cached;
  const { rows } = await q(client).query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName]
  );
  return setCacheEntry(cacheKey, Boolean(rows[0]?.exists), 10 * 60 * 1000);
}

async function getTableColumns(client, tableName) {
  const cacheKey = `support-repo:columns:${tableName}`;
  const cached = getCacheEntry(cacheKey);
  if (cached) return cached;
  const { rows } = await q(client).query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return setCacheEntry(cacheKey, new Set(rows.map((row) => row.column_name)), 10 * 60 * 1000);
}

function buildUserSelect(alias, columns, outputPrefix = '') {
  const prefix = outputPrefix ? `${outputPrefix}_` : '';
  return [
    `${alias}.username AS ${prefix}username`,
    `${alias}.email AS ${prefix}email`,
    columns.has('first_name') ? `${alias}.first_name AS ${prefix}first_name` : `NULL::text AS ${prefix}first_name`,
    columns.has('last_name') ? `${alias}.last_name AS ${prefix}last_name` : `NULL::text AS ${prefix}last_name`
  ];
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
  const [hasSupportThreads, hasSupportMessages, hasUsers] = await Promise.all([
    tableExists(client, 'support_threads'),
    tableExists(client, 'support_messages'),
    tableExists(client, 'users')
  ]);

  if (!hasSupportThreads) {
    return { items: [], total: 0 };
  }

  const userColumns = await getTableColumns(client, 'users');
  const userSelect = buildUserSelect('u', userColumns).join(',\n      ');
  const values = [];
  const where = buildFilters(filters, values, options);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const userJoin = hasUsers ? 'LEFT JOIN users u ON u.id = st.user_id' : 'LEFT JOIN LATERAL (SELECT NULL::text AS username, NULL::text AS email, NULL::text AS first_name, NULL::text AS last_name) u ON TRUE';
  const lastMessageJoin = hasSupportMessages
    ? `LEFT JOIN LATERAL (
      SELECT sm.message, sm.sender_type, sm.created_at
      FROM support_messages sm
      WHERE sm.thread_id = st.id
      ORDER BY sm.created_at DESC
      LIMIT 1
    ) last_message ON TRUE`
    : `LEFT JOIN LATERAL (
      SELECT NULL::text AS message, NULL::text AS sender_type, NULL::timestamptz AS created_at
    ) last_message ON TRUE`;
  const messageCountJoin = hasSupportMessages
    ? `LEFT JOIN LATERAL (
      SELECT COUNT(*) AS message_count
      FROM support_messages smc
      WHERE smc.thread_id = st.id
    ) message_counts ON TRUE`
    : `LEFT JOIN LATERAL (
      SELECT 0::bigint AS message_count
    ) message_counts ON TRUE`;
  const orderColumn = hasSupportThreads && (await getTableColumns(client, 'support_threads')).has('updated_at') ? 'st.updated_at' : 'st.created_at';

  values.push(pagination.limit, pagination.offset);
  const listSql = `
    SELECT
      st.*,
      ${userSelect},
      last_message.message AS last_message,
      last_message.sender_type AS last_sender_type,
      last_message.created_at AS last_message_at,
      COALESCE(message_counts.message_count, 0)::int AS message_count
    FROM support_threads st
    ${userJoin}
    ${lastMessageJoin}
    ${messageCountJoin}
    ${whereSql}
    ORDER BY ${orderColumn} DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `;

  const countSql = `
    SELECT COUNT(*)
    FROM support_threads st
    ${userJoin}
    ${hasSupportMessages ? `LEFT JOIN LATERAL (
      SELECT sm.message
      FROM support_messages sm
      WHERE sm.thread_id = st.id
      ORDER BY sm.created_at DESC
      LIMIT 1
    ) last_message ON TRUE` : `LEFT JOIN LATERAL (
      SELECT NULL::text AS message
    ) last_message ON TRUE`}
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
  const userColumns = await getTableColumns(client, 'users');
  const userSelect = buildUserSelect('u', userColumns).join(',\n      ');
  const { rows } = await q(client).query(
    `SELECT
      st.*,
      ${userSelect},
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
  const userColumns = await getTableColumns(client, 'users');
  const userSelect = buildUserSelect('u', userColumns).join(',\n      ');
  const { rows } = await q(client).query(
    `SELECT
      st.*,
      ${userSelect},
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
     SET status = $2::varchar,
         updated_at = NOW(),
         closed_at = CASE WHEN $2::varchar = 'closed' THEN COALESCE(closed_at, NOW()) ELSE NULL END,
         closed_by = CASE WHEN $2::varchar = 'closed' THEN closed_by ELSE NULL END
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
  const userColumns = await getTableColumns(client, 'users');
  const senderSelect = buildUserSelect('sender', userColumns, 'sender').join(',\n      ');
  const { rows } = await q(client).query(
    `SELECT
      sm.*,
      ${senderSelect}
     FROM support_messages sm
     LEFT JOIN users sender ON sender.id = sm.sender_user_id
     WHERE sm.thread_id = $1
     ORDER BY sm.created_at ASC`,
    [threadId]
  );
  return rows;
}

async function listUserAdminReplies(client, userId, limit = 100) {
  const { rows } = await q(client).query(
    `SELECT
       sm.id,
       sm.thread_id,
       sm.message,
       sm.created_at,
       st.user_id,
       st.subject
     FROM support_messages sm
     JOIN support_threads st ON st.id = sm.thread_id
     WHERE st.user_id = $1
       AND sm.sender_type = 'admin'
     ORDER BY sm.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function getThreadSummary(client, options = {}) {
  if (!(await tableExists(client, 'support_threads'))) {
    return { total_threads: 0, open_threads: 0, replied_threads: 0, closed_threads: 0 };
  }

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
  listUserAdminReplies,
  getThreadSummary
};
