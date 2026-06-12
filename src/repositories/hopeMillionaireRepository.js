function q(client) {
  return client || require('../db/pool').pool;
}

async function acquirePackageLock(client, packageAmount) {
  await q(client).query('SELECT pg_advisory_xact_lock($1, $2)', [3072, Number(packageAmount)]);
}

async function acquireUserLock(client, userId) {
  await q(client).query('SELECT pg_advisory_xact_lock($1, hashtext($2))', [3073, String(userId)]);
}

async function getPackageState(client, userId, packageAmount, options = {}) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM hope_millionaire_package_states
     WHERE user_id = $1 AND package_amount = $2
     ${options.forUpdate ? 'FOR UPDATE' : ''}`,
    [userId, packageAmount]
  );
  return rows[0] || null;
}

async function activatePackage(client, userId, packageAmount, payload = {}) {
  const { rows } = await q(client).query(
    `INSERT INTO hope_millionaire_package_states (
       user_id, package_amount, is_active, has_purchased, period_earnings,
       inactive_at, reactivated_at, last_purchase_at, reactivation_reason, reactivation_referral_id
     )
     VALUES ($1, $2, TRUE, $3, 0, NULL, NOW(), $4, $5, $6)
     ON CONFLICT (user_id, package_amount) DO UPDATE
     SET is_active = TRUE,
         has_purchased = hope_millionaire_package_states.has_purchased OR EXCLUDED.has_purchased,
         period_earnings = 0,
         inactive_at = NULL,
         reactivated_at = NOW(),
         last_purchase_at = COALESCE(EXCLUDED.last_purchase_at, hope_millionaire_package_states.last_purchase_at),
         reactivation_reason = EXCLUDED.reactivation_reason,
         reactivation_referral_id = EXCLUDED.reactivation_referral_id,
         updated_at = NOW()
     RETURNING *`,
    [
      userId,
      packageAmount,
      Boolean(payload.hasPurchased),
      payload.lastPurchaseAt || null,
      payload.reason || null,
      payload.referralId || null
    ]
  );
  return rows[0];
}

async function recordAdditionalPurchase(client, userId, packageAmount, purchasedAt) {
  const { rows } = await q(client).query(
    `UPDATE hope_millionaire_package_states
     SET has_purchased = TRUE,
         last_purchase_at = $3,
         updated_at = NOW()
     WHERE user_id = $1 AND package_amount = $2
     RETURNING *`,
    [userId, packageAmount, purchasedAt]
  );
  return rows[0] || null;
}

async function addEarnings(client, userId, packageAmount, amount, incomeCap) {
  const { rows } = await q(client).query(
    `INSERT INTO hope_millionaire_package_states (
       user_id, package_amount, is_active, period_earnings, lifetime_earnings
     )
     VALUES ($1, $2, FALSE, $3, $3)
     ON CONFLICT (user_id, package_amount) DO UPDATE
     SET period_earnings = hope_millionaire_package_states.period_earnings + $3,
         lifetime_earnings = hope_millionaire_package_states.lifetime_earnings + $3,
         is_active = CASE
           WHEN hope_millionaire_package_states.period_earnings + $3 >= $4 THEN FALSE
           ELSE hope_millionaire_package_states.is_active
         END,
         inactive_at = CASE
           WHEN hope_millionaire_package_states.period_earnings + $3 >= $4
             THEN COALESCE(hope_millionaire_package_states.inactive_at, NOW())
           ELSE hope_millionaire_package_states.inactive_at
         END,
         updated_at = NOW()
     RETURNING *`,
    [userId, packageAmount, amount, incomeCap]
  );
  return rows[0];
}

async function findQualifyingReferral(client, userId, inactiveAt) {
  if (!inactiveAt) return null;
  const { rows } = await q(client).query(
    `SELECT id, username, created_at
     FROM users
     WHERE sponsor_id = $1 AND created_at > $2
     ORDER BY created_at ASC
     LIMIT 1`,
    [userId, inactiveAt]
  );
  return rows[0] || null;
}

async function findEntryByRequestId(client, userId, requestId) {
  if (!requestId) return null;
  const { rows } = await q(client).query(
    `SELECT * FROM hope_millionaire_entries WHERE user_id = $1 AND request_id = $2`,
    [userId, requestId]
  );
  return rows[0] || null;
}

async function createEntry(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO hope_millionaire_entries (user_id, package_amount, entry_source, request_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [payload.userId, payload.packageAmount, payload.entrySource, payload.requestId || null]
  );
  return rows[0];
}

async function findOpenParent(client, packageAmount, excludeEntryId) {
  const { rows } = await q(client).query(
    `SELECT e.*
     FROM hope_millionaire_entries e
     WHERE e.package_amount = $1
       AND e.id <> $2
       AND e.status = 'open'
       AND e.filled_slots < 3
     ORDER BY e.queue_position ASC
     LIMIT 1
     FOR UPDATE OF e`,
    [packageAmount, excludeEntryId]
  );
  return rows[0] || null;
}

async function placeEntry(client, entryId, parentEntryId, slotPosition) {
  const { rows } = await q(client).query(
    `UPDATE hope_millionaire_entries
     SET parent_entry_id = $2, slot_position = $3
     WHERE id = $1 AND parent_entry_id IS NULL
     RETURNING *`,
    [entryId, parentEntryId, slotPosition]
  );
  return rows[0] || null;
}

async function incrementParentFill(client, parentEntryId) {
  const { rows } = await q(client).query(
    `UPDATE hope_millionaire_entries
     SET filled_slots = filled_slots + 1,
         status = CASE WHEN filled_slots + 1 = 3 THEN 'completed' ELSE status END,
         completed_at = CASE WHEN filled_slots + 1 = 3 THEN NOW() ELSE completed_at END
     WHERE id = $1 AND status = 'open' AND filled_slots < 3
     RETURNING *`,
    [parentEntryId]
  );
  return rows[0] || null;
}

async function createTransaction(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO hope_millionaire_transactions (
       user_id, entry_id, package_amount, transaction_type, amount, source_user_id,
       upline_level, wallet_transaction_id, event_key, metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (event_key) DO NOTHING
     RETURNING *`,
    [
      payload.userId,
      payload.entryId || null,
      payload.packageAmount,
      payload.transactionType,
      payload.amount || 0,
      payload.sourceUserId || null,
      payload.uplineLevel || null,
      payload.walletTransactionId || null,
      payload.eventKey,
      payload.metadata || {}
    ]
  );
  return rows[0] || null;
}

async function getTransactionByEventKey(client, eventKey) {
  const { rows } = await q(client).query(
    `SELECT * FROM hope_millionaire_transactions WHERE event_key = $1`,
    [eventKey]
  );
  return rows[0] || null;
}

async function listPackageStates(client, userId) {
  const { rows } = await q(client).query(
    `SELECT * FROM hope_millionaire_package_states WHERE user_id = $1`,
    [userId]
  );
  return rows;
}

async function listCurrentEntries(client, userId) {
  const { rows } = await q(client).query(
    `SELECT DISTINCT ON (package_amount) *
     FROM hope_millionaire_entries
     WHERE user_id = $1 AND status = 'open'
     ORDER BY package_amount, created_at ASC, id ASC`,
    [userId]
  );
  return rows;
}

async function listAutomaticReentryCounts(client, userId) {
  const { rows } = await q(client).query(
    `SELECT package_amount, COUNT(*)::INTEGER AS reentry_count
     FROM hope_millionaire_entries
     WHERE user_id = $1 AND entry_source = 'automatic_reentry'
     GROUP BY package_amount`,
    [userId]
  );
  return rows;
}

async function listTransactions(client, userId, limit = 30) {
  const { rows } = await q(client).query(
    `SELECT t.*, source_user.username AS source_username
     FROM hope_millionaire_transactions t
     LEFT JOIN users source_user ON source_user.id = t.source_user_id
     WHERE t.user_id = $1
     ORDER BY t.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

module.exports = {
  acquirePackageLock,
  acquireUserLock,
  getPackageState,
  activatePackage,
  recordAdditionalPurchase,
  addEarnings,
  findQualifyingReferral,
  findEntryByRequestId,
  createEntry,
  findOpenParent,
  placeEntry,
  incrementParentFill,
  createTransaction,
  getTransactionByEventKey,
  listPackageStates,
  listCurrentEntries,
  listAutomaticReentryCounts,
  listTransactions
};
