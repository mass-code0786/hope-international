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

function normalizePackageAmount(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? toMoney(parsed) : toMoney(fallback);
}

function applyPackageFilter(values, where, packageAmount, columnName = 'package_amount') {
  if (packageAmount === undefined || packageAmount === null || packageAmount === '') {
    return;
  }

  values.push(normalizePackageAmount(packageAmount));
  where.push(`${columnName} = $${values.length}`);
}

function normalizeEntry(row) {
  if (!row) return null;
  return {
    ...row,
    package_amount: normalizePackageAmount(row.package_amount),
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
    package_amount: normalizePackageAmount(row.package_amount),
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
       package_amount,
       parent_entry_id,
       slot_position,
       filled_slots_count,
       status,
       entry_source,
       recycle_count,
       cycle_number,
       completed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      payload.userId,
      normalizePackageAmount(payload.packageAmount, 2),
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
  const values = [userId];
  const where = ['user_id = $1'];
  applyPackageFilter(values, where, options.packageAmount);
  const { rows } = await q(client).query(
    `SELECT *
     FROM autopool_entries
     WHERE ${where.join(' AND ')}
     ORDER BY cycle_number DESC, created_at DESC
     LIMIT 1${lockClause}`,
    values
  );
  return normalizeEntry(rows[0] || null);
}

async function getCurrentUserFocusEntry(client, userId, options = {}) {
  const values = [userId];
  const where = ['ae.user_id = $1'];
  applyPackageFilter(values, where, options.packageAmount, 'ae.package_amount');
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
     WHERE ${where.join(' AND ')}
     ORDER BY CASE WHEN ae.status = 'active' THEN 0 ELSE 1 END,
              CASE WHEN ae.status = 'active' THEN aq.position END ASC NULLS LAST,
              CASE WHEN ae.status = 'active' THEN ae.created_at END ASC NULLS LAST,
              ae.created_at DESC
     LIMIT 1`,
    values
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

  applyPackageFilter(values, where, options.packageAmount, 'ae.package_amount');

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
       package_amount,
       source_user_id,
       wallet_transaction_id,
       request_id,
       event_key,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      payload.userId,
      payload.entryId || null,
      payload.type,
      payload.amount,
      normalizePackageAmount(payload.packageAmount, 2),
      payload.sourceUserId || null,
      payload.walletTransactionId || null,
      payload.requestId || null,
      payload.eventKey || null,
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

async function getTransactionByEventKey(client, eventKey) {
  const { rows } = await q(client).query(
    `SELECT at.*,
            ae.cycle_number,
            ae.recycle_count
     FROM autopool_transactions at
     LEFT JOIN autopool_entries ae ON ae.id = at.entry_id
     WHERE at.event_key = $1
     LIMIT 1`,
    [eventKey]
  );
  return normalizeTransaction(rows[0] || null);
}

async function listEntryChildren(client, parentEntryId) {
  const { rows } = await q(client).query(
    `SELECT ac.slot_position,
            child.id AS entry_id,
            child.user_id,
            child.package_amount,
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

async function listUserActiveEntries(client, userId, limit = 20, options = {}) {
  const values = [userId];
  const where = [
    'ae.user_id = $1',
    `ae.status = 'active'`
  ];
  applyPackageFilter(values, where, options.packageAmount, 'ae.package_amount');
  values.push(Number(limit));
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
     WHERE ${where.join(' AND ')}
     ORDER BY aq.position ASC NULLS LAST, ae.created_at ASC, ae.id ASC
     LIMIT $${values.length}`,
    values
  );
  return rows.map(normalizeEntry);
}

async function getUserStats(client, userId, options = {}) {
  const entryValues = [userId];
  const entryWhere = ['user_id = $1'];
  applyPackageFilter(entryValues, entryWhere, options.packageAmount);

  const transactionValues = [userId];
  const transactionWhere = ['user_id = $1'];
  applyPackageFilter(transactionValues, transactionWhere, options.packageAmount);

  const [entryResult, transactionResult] = await Promise.all([
    q(client).query(
      `SELECT
         COUNT(*)::int AS total_entries,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_entries,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_cycles,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS total_recycles
       FROM autopool_entries
       WHERE ${entryWhere.join(' AND ')}`,
      entryValues
    ),
    q(client).query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE 0 END), 0)::numeric(14,2) AS owner_earnings,
         COALESCE(SUM(CASE WHEN type = 'UPLINE' THEN amount ELSE 0 END), 0)::numeric(14,2) AS upline_earnings,
         COALESCE(SUM(CASE WHEN type IN ('EARN', 'UPLINE') THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_earnings,
         COALESCE(SUM(CASE WHEN type IN ('BONUS', 'AUCTION') THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_bonus_share
       FROM autopool_transactions
       WHERE ${transactionWhere.join(' AND ')}`,
      transactionValues
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
    totalBonusShare: toMoney(transactions.total_bonus_share || 0)
  };
}

async function getAutopoolStats(client, userId, options = {}) {
  const values = [userId];
  const where = ['user_id = $1'];
  applyPackageFilter(values, where, options.packageAmount);
  const { rows } = await q(client).query(
    `SELECT
       COUNT(*) FILTER (WHERE entry_source = 'purchase')::int AS my_entry_count,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS recycle_count
     FROM autopool_entries
     WHERE ${where.join(' AND ')}`,
    values
  );

  const row = rows[0] || {};

  return {
    myEntry: Number(row.my_entry_count || 0),
    recycle: Number(row.recycle_count || 0)
  };
}

async function listUserPackageStats(client, userId) {
  const [entryResult, transactionResult] = await Promise.all([
    q(client).query(
      `SELECT
         package_amount,
         COUNT(*)::int AS total_entries,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active_entries,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_cycles,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS total_recycles,
         COUNT(*) FILTER (WHERE entry_source = 'purchase')::int AS my_entry_count
       FROM autopool_entries
       WHERE user_id = $1
       GROUP BY package_amount`,
      [userId]
    ),
    q(client).query(
      `SELECT
         package_amount,
         COALESCE(SUM(CASE WHEN type = 'EARN' THEN amount ELSE 0 END), 0)::numeric(14,2) AS owner_earnings,
         COALESCE(SUM(CASE WHEN type = 'UPLINE' THEN amount ELSE 0 END), 0)::numeric(14,2) AS upline_earnings,
         COALESCE(SUM(CASE WHEN type IN ('EARN', 'UPLINE') THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_earnings,
         COALESCE(SUM(CASE WHEN type IN ('BONUS', 'AUCTION') THEN amount ELSE 0 END), 0)::numeric(14,2) AS total_bonus_share
       FROM autopool_transactions
       WHERE user_id = $1
       GROUP BY package_amount`,
      [userId]
    )
  ]);

  const packageStats = new Map();

  for (const row of entryResult.rows) {
    const amount = normalizePackageAmount(row.package_amount);
    packageStats.set(amount, {
      amount,
      totalEntries: Number(row.total_entries || 0),
      activeEntries: Number(row.active_entries || 0),
      completedCycles: Number(row.completed_cycles || 0),
      totalRecycles: Number(row.total_recycles || 0),
      myEntry: Number(row.my_entry_count || 0),
      recycle: Number(row.total_recycles || 0),
      ownerEarnings: 0,
      uplineEarnings: 0,
      totalEarnings: 0,
      totalBonusShare: 0
    });
  }

  for (const row of transactionResult.rows) {
    const amount = normalizePackageAmount(row.package_amount);
    const current = packageStats.get(amount) || {
      amount,
      totalEntries: 0,
      activeEntries: 0,
      completedCycles: 0,
      totalRecycles: 0,
      myEntry: 0,
      recycle: 0,
      ownerEarnings: 0,
      uplineEarnings: 0,
      totalEarnings: 0,
      totalBonusShare: 0
    };

    current.ownerEarnings = toMoney(row.owner_earnings || 0);
    current.uplineEarnings = toMoney(row.upline_earnings || 0);
    current.totalEarnings = toMoney(row.total_earnings || 0);
    current.totalBonusShare = toMoney(row.total_bonus_share || 0);
    packageStats.set(amount, current);
  }

  return packageStats;
}

async function listUserPackageFocusEntries(client, userId) {
  const { rows } = await q(client).query(
    `SELECT DISTINCT ON (ae.package_amount)
            ae.*,
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
     ORDER BY ae.package_amount ASC,
              CASE WHEN ae.status = 'active' THEN 0 ELSE 1 END,
              CASE WHEN ae.status = 'active' THEN aq.position END ASC NULLS LAST,
              CASE WHEN ae.status = 'active' THEN ae.created_at END ASC NULLS LAST,
              ae.created_at DESC`,
    [userId]
  );
  return rows.map(normalizeEntry);
}

async function listChildrenForParentEntries(client, parentEntryIds = []) {
  if (!Array.isArray(parentEntryIds) || parentEntryIds.length === 0) {
    return [];
  }

  const { rows } = await q(client).query(
    `SELECT ac.parent_entry_id,
            ac.slot_position,
            child.id AS entry_id,
            child.user_id,
            child.package_amount,
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
     WHERE ac.parent_entry_id = ANY($1::uuid[])
     ORDER BY ac.parent_entry_id ASC, ac.slot_position ASC`,
    [parentEntryIds]
  );

  return rows.map((row) => ({
    ...normalizeEntry(row),
    entry_id: row.entry_id,
    parent_entry_id: row.parent_entry_id
  }));
}

async function listUserTransactions(client, userId, pagination = {}, options = {}) {
  const { limit, offset } = withPaging(pagination.limit, pagination.offset);
  const listValues = [userId];
  const listWhere = ['at.user_id = $1'];
  applyPackageFilter(listValues, listWhere, options.packageAmount, 'at.package_amount');
  listValues.push(limit, offset);

  const countValues = [userId];
  const countWhere = ['user_id = $1'];
  applyPackageFilter(countValues, countWhere, options.packageAmount);

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
       WHERE ${listWhere.join(' AND ')}
       ORDER BY at.created_at DESC, at.id DESC
       LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
      listValues
    ),
    q(client).query(
      `SELECT COUNT(*)::int AS total
       FROM autopool_transactions
       WHERE ${countWhere.join(' AND ')}`,
      countValues
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
  getTransactionByEventKey,
  listEntryChildren,
  listChildrenForParentEntries,
  listUserActiveEntries,
  getUserStats,
  getAutopoolStats,
  listUserPackageStats,
  listUserPackageFocusEntries,
  listUserTransactions
};
