function q(client) {
  return client || require('../db/pool').pool;
}

async function createWallet(client, userId) {
  await q(client).query(
    `INSERT INTO wallets (user_id, balance)
     VALUES ($1, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function getWallet(client, userId) {
  const { rows } = await q(client).query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

async function adjustBalance(client, userId, amountDelta) {
  const { rows } = await q(client).query(
    `UPDATE wallets
     SET balance = balance + $2
     WHERE user_id = $1
     RETURNING *`,
    [userId, amountDelta]
  );
  return rows[0] || null;
}

async function createTransaction(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO wallet_transactions (user_id, tx_type, source, amount, reference_id, metadata, created_by_admin_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      payload.userId,
      payload.txType,
      payload.source,
      payload.amount,
      payload.referenceId || null,
      payload.metadata || {},
      payload.createdByAdminId || null
    ]
  );
  return rows[0];
}

async function listTransactions(client, userId, limit = 50) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM wallet_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

module.exports = {
  createWallet,
  getWallet,
  adjustBalance,
  createTransaction,
  listTransactions
};
