function q(client) {
  return client || require('../db/pool').pool;
}

function withPaging(limit = 20, offset = 0) {
  return {
    limit: Math.max(1, Number(limit) || 20),
    offset: Math.max(0, Number(offset) || 0)
  };
}

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizeEntry(row) {
  if (!row) return null;
  return {
    ...row,
    filled_slots_count: Number(row.filled_slots_count || 0),
    recycle_count: Number(row.recycle_count || 0),
    cycle_number: Number(row.cycle_number || 0),
    slot_position: row.slot_position === null || row.slot_position === undefined ? null : Number(row.slot_position),
    queue_position: row.queue_position === null || row.queue_position === undefined ? null : Number(row.queue_position)
  };
}

function normalizeTransaction(row) {
  if (!row) return null;
  return {
    ...row,
    amount: toMoney(row.amount),
    cycle_number: row.cycle_number === null || row.cycle_number === undefined ? null : Number(row.cycle_number),
    recycle_count: row.recycle_count === null || row.recycle_count === undefined ? null : Number(row.recycle_count),
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  };
}

async function acquireGlobalQueueLock(client) {
  await q(client).query('SELECT pg_advisory_xact_lock($1, $2)', [2048, 1337]);
}

async function createEntry(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO autopool_entries (
       user_id,
       parent_entry_id,
       slot_position,
       filled_slots_count,
       status,
       entry_source,
       recycle_count,
       cycle_number,
       completed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      payload.userId,
      payload.parentEntryId || null,
      payload.slotPosition ?? null,
      Number(payload.filledSlotsCount || 0),
      payload.status || 'active',
      payload.entrySource || 'purchase',
      Number(payload.recycleCount || 0),
      Number(payload.cycleNumber || 1),
      payload.completedAt || null
    ]
  );
  return normalizeEntry(rows[0] || null);
}

async function getEntryById(client, entryId, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT ae.*,
            u.username,
            u.first_name,
            u.last_name,
            parent.user_id AS parent_user_id,
            parent.cycle_number AS parent_cycle_number,
            parent_user.username AS parent_username,
            parent_user.first_name AS parent_first_name,
            parent_user.last_name AS parent_last_name
     FROM autopool_entries ae
     JOIN users u ON u.id = ae.user_id
     LEFT JOIN autopool_entries parent ON parent.id = ae.parent_entry_id
     LEFT JOIN users parent_user ON parent_user.id = parent.user_id
     WHERE ae.id = $1${lockClause}`,
    [entryId]
  );
  return normalizeEntry(rows[0] || null);
}

async function getLatestUserEntry(client, userId, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT *
     FROM autopool_entries
     WHERE user_id = $1
     ORDER BY cycle_number DESC, created_at DESC
     LIMIT 1${lockClause}`,
    [userId]
  );
  return normalizeEntry(rows[0] || null);
}

async function getCurrentUserFocusEntry(client, userId) {
  const { rows } = await q(client).query(
    `SELECT ae.*,
            aq.position AS queue_position,
            u.username,
            u.first_name,
            u.last_name,
            parent.user_id AS parent_user_id,
            parent.cycle_number AS parent_cycle_number,
            parent_user.username AS parent_username,
            parent_user.first_name AS parent_first_name,
            parent_user.last_name AS parent_last_name
     FROM autopool_entries ae
     JOIN users u ON u.id = ae.user_id
     LEFT JOIN autopool_queue aq ON aq.entry_id = ae.id
     LEFT JOIN autopool_entries parent ON parent.id = ae.parent_entry_id
     LEFT JOIN users parent_user ON parent_user.id = parent.user_id
     WHERE ae.user_id = $1
     ORDER BY CASE WHEN ae.status = 'active' THEN 0 ELSE 1 END,
              CASE WHEN ae.status = 'active' THEN aq.position END ASC NULLS LAST,
              CASE WHEN ae.status = 'active' THEN ae.created_at END ASC NULLS LAST,
              ae.created_at DESC
     LIMIT 1`,
    [userId]
  );
  return normalizeEntry(rows[0] || null);
}

async function updateEntryPlacement(client, entryId, parentEntryId, slotPosition) {
  const { rows } = await q(client).query(
    `UPDATE autopool_entries
     SET parent_entry_id = $2,
         slot_position = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [entryId, parentEntryId || null, slotPosition ?? null]
  );
  return normalizeEntry(rows[0] || null);
}

async function incrementFilledSlots(client, entryId) {
  const { rows } = await q(client).query(
    `UPDATE autopool_entries
     SET filled_slots_count = LEAST(3, COALESCE(filled_slots_count, 0) + 1),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [entryId]
  );
  return normalizeEntry(rows[0] || null);
}

async function markEntryCompleted(client, entryId, recycleCount) {
  const { rows } = await q(client).query(
    `UPDATE autopool_entries
     SET status = 'completed',
         filled_slots_count = 3,
         recycle_count = $2,
         completed_at = COALESCE(completed_at, NOW()),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [entryId, Number(recycleCount || 0)]
  );
  return normalizeEntry(rows[0] || null);
}

async function createChildLink(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO autopool_children (parent_entry_id, child_entry_id, slot_position)
     VALUES ($1, $2, $3)
     ON CONFLICT (parent_entry_id, slot_position)
     DO UPDATE SET child_entry_id = EXCLUDED.child_entry_id
     RETURNING *`,
    [payload.parentEntryId, payload.childEntryId, Number(payload.slotPosition)]
  );
  return rows[0] || null;
}

async function enqueueEntry(client, entryId, queuedAt = null) {
  const { rows } = await q(client).query(
    `INSERT INTO autopool_queue (entry_id, queued_at)
     VALUES ($1, COALESCE($2, NOW()))
     ON CONFLICT (entry_id) DO NOTHING
     RETURNING *`,
    [entryId, queuedAt]
  );

  if (rows[0]) {
    return {
      ...rows[0],
      position: Number(rows[0].position || 0)
    };
  }

  const existing = await getQueueEntry(client, entryId);
  return existing;
}

async function getQueueEntry(client, entryId, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT *
     FROM autopool_queue
     WHERE entry_id = $1${lockClause}`,
    [entryId]
  );
  const row = rows[0] || null;
  return row ? { ...row, position: Number(row.position || 0) } : null;
}

async function removeQueuedEntry(client, entryId) {
  await q(client).query('DELETE FROM autopool_queue WHERE entry_id = $1', [entryId]);
}

async function getNextQueueParentForUpdate(client, options = {}) {
  const values = [];
  const where = [
    `ae.status = 'active'`,
    `ae.filled_slots_count < 3`
  ];

  if (options.excludeEntryId) {
    values.push(options.excludeEntryId);
    where.push(`ae.id <> $${values.length}`);
  }

  const { rows } = await q(client).query(
    `SELECT aq.position AS queue_position,
            ae.*,
            u.username,
            u.first_name,
            u.last_name
     FROM autopool_queue aq
     JOIN autopool_entries ae ON ae.id = aq.entry_id
     JOIN users u ON u.id = ae.user_id
     WHERE ${where.join(' AND ')}
     ORDER BY aq.position ASC, aq.queued_at ASC, ae.created_at ASC, ae.id ASC
     LIMIT 1
     FOR UPDATE OF aq, ae`,
    values
  );
  return normalizeEntry(rows[0] || null);
}

async function getQueueHealth(client) {
  const { rows } = await q(client).query(
    `SELECT
       (SELECT COUNT(*)::int
        FROM autopool_entries
        WHERE status = 'active'
          AND filled_slots_count < 3) AS active_entry_count,
       (SELECT COUNT(*)::int
        FROM autopool_queue) AS queued_entry_count,
       (SELECT COUNT(*)::int
        FROM autopool_entries ae
        LEFT JOIN autopool_queue aq ON aq.entry_id = ae.id
        WHERE ae.status = 'active'
          AND ae.filled_slots_count < 3
          AND aq.entry_id IS NULL) AS missing_queue_entries,
       (SELECT COUNT(*)::int
        FROM autopool_queue aq
        JOIN autopool_entries ae ON ae.id = aq.entry_id
        WHERE ae.status <> 'active'
           OR ae.filled_slots_count >= 3) AS invalid_queue_entries`
  );
  const row = rows[0] || {};
  return {
    activeEntryCount: Number(row.active_entry_count || 0),
    queuedEntryCount: Number(row.queued_entry_count || 0),
    missingQueueEntries: Number(row.missing_queue_entries || 0),
    invalidQueueEntries: Number(row.invalid_queue_entries || 0)
  };
}

async function rebuildQueue(client) {
  await q(client).query('TRUNCATE TABLE autopool_queue RESTART IDENTITY');
  await q(client).query(
    `INSERT INTO autopool_queue (entry_id, queued_at)
     SELECT id, created_at
     FROM autopool_entries
     WHERE status = 'active'
       AND filled_slots_count < 3
     ORDER BY created_at ASC, id ASC`
  );
  return getQueueHealth(client);
}

async function createTransaction(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO autopool_transactions (
       user_id,
       entry_id,
       type,
       amount,
       source_user_id,
       wallet_transaction_id,
       request_id,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      payload.userId,
      payload.entryId || null,
      payload.type,
      payload.amount,
      payload.sourceUserId || null,
      payload.walletTransactionId || null,
      payload.requestId || null,
      payload.metadata || {}
    ]
  );
  return normalizeTransaction(rows[0] || null);
}

async function getEntryTransactionByRequestId(client, userId, requestId) {
  const { rows } = await q(client).query(
    `SELECT at.*,
            ae.cycle_number,
            ae.recycle_count
     FROM autopool_transactions at
     LEFT JOIN autopool_entries ae ON ae.id = at.entry_id
     WHERE at.user_id = $1
       AND at.request_id = $2
       AND at.type = 'ENTRY'
     LIMIT 1`,
    [userId, requestId]
  );
  return normalizeTransaction(rows[0] || null);
}

async function listEntryChildren(client, parentEntryId) {
  const { rows } = await q(client).query(
    `SELECT ac.slot_position,
            child.id AS entry_id,
            child.user_id,
            child.status,
            child.filled_slots_count,
            child.recycle_count,
            child.cycle_number,
            child.created_at,
            child.updated_at,
            u.username,
            u.first_name,
            u.last_name
     FROM autopool_children ac
     JOIN autopool_entries child ON child.id = ac.child_entry_id
     JOIN users u ON u.id = child.user_id
     WHERE ac.parent_entry_id = $1
     ORDER BY ac.slot_position ASC`,
    [parentEntryId]
  );
  return rows.map((row) => ({
    ...normalizeEntry(row),
    entry_id: row.entry_id
  }));
}

async function listUserActiveEntries(client, userId, limit = 20) {
  const { rows } = await q(client).query(
    `SELECT ae.*,
            aq.position AS queue_position,
            parent.user_id AS parent_user_id,
            parent.cycle_number AS parent_cycle_number,
            parent_user.username AS parent_username,
            parent_user.first_name AS parent_first_name,
            parent_user.last_name AS parent_last_name
     FROM autopool_entries ae
     LEFT JOIN autopool_queue aq ON aq.entry_id = ae.id
     LEFT JOIN autopool_entries parent ON parent.id = ae.parent_entry_id
     LEFT JOIN users parent_user ON parent_user.id = parent.user_id
     WHERE ae.user_id = $1
       AND ae.status = 'active'
     ORDER BY aq.position ASC NULLS LAST, ae.created_at ASC, ae.id ASC
     LIMIT $2`,
    [userId, Number(limit)]
  );
  return rows.map(normalizeEntry);
}

async function getUserStats(client, userId) {
  const [entryResult, transactionResult] = await Promise.all([
    q(client).query(
      `SELECT
         COUNT(*)::int AS total_entries,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_entries,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_cycles,
         COALESCE(MAX(recycle_count), 0)::int AS total_recycles
       FROM autopool_entries
       WHERE user_id = $1`,
      [userId]
    ),
    q(client).query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE 0 END), 0)::numeric(14,2) AS owner_earnings,
         COALESCE(SUM(CASE WHEN type = 'UPLINE' THEN amount ELSE 0 END), 0)::numeric(14,2) AS upline_earnings,
         COALESCE(SUM(CASE WHEN type IN ('EARN', 'UPLINE') THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_earnings,
         COALESCE(SUM(CASE WHEN type = 'AUCTION' THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_auction_share
       FROM autopool_transactions
       WHERE user_id = $1`,
      [userId]
    )
  ]);

  const entries = entryResult.rows[0] || {};
  const transactions = transactionResult.rows[0] || {};

  return {
    totalEntries: Number(entries.total_entries || 0),
    activeEntries: Number(entries.active_entries || 0),
    completedCycles: Number(entries.completed_cycles || 0),
    totalRecycles: Number(entries.total_recycles || 0),
    ownerEarnings: toMoney(transactions.owner_earnings || 0),
    uplineEarnings: toMoney(transactions.upline_earnings || 0),
    totalEarnings: toMoney(transactions.total_earnings || 0),
    totalAuctionShare: toMoney(transactions.total_auction_share || 0)
  };
}

async function listUserTransactions(client, userId, pagination = {}) {
  const { limit, offset } = withPaging(pagination.limit, pagination.offset);
  const [listResult, countResult] = await Promise.all([
    q(client).query(
      `SELECT at.*,
              ae.cycle_number,
              ae.recycle_count,
              source_user.username AS source_username,
              source_user.first_name AS source_first_name,
              source_user.last_name AS source_last_name
       FROM autopool_transactions at
       LEFT JOIN autopool_entries ae ON ae.id = at.entry_id
       LEFT JOIN users source_user ON source_user.id = at.source_user_id
       WHERE at.user_id = $1
       ORDER BY at.created_at DESC, at.id DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    q(client).query(
      `SELECT COUNT(*)::int AS total
       FROM autopool_transactions
       WHERE user_id = $1`,
      [userId]
    )
  ]);

  return {
    items: listResult.rows.map(normalizeTransaction),
    total: Number(countResult.rows[0]?.total || 0)
  };
}

module.exports = {
  acquireGlobalQueueLock,
  createEntry,
  getEntryById,
  getLatestUserEntry,
  getCurrentUserFocusEntry,
  updateEntryPlacement,
  incrementFilledSlots,
  markEntryCompleted,
  createChildLink,
  enqueueEntry,
  getQueueEntry,
  removeQueuedEntry,
  getNextQueueParentForUpdate,
  getQueueHealth,
  rebuildQueue,
  createTransaction,
  getEntryTransactionByRequestId,
  listEntryChildren,
  listUserActiveEntries,
  getUserStats,
  listUserTransactions
};
