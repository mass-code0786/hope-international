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

async function listTransactionsBySource(client, userId, source, limit = 200) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM wallet_transactions
     WHERE user_id = $1
       AND source = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, source, limit]
  );
  return rows;
}

async function upsertWalletBinding(client, userId, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO user_wallet_bindings (user_id, wallet_address, network)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id)
     DO UPDATE SET wallet_address = EXCLUDED.wallet_address, network = EXCLUDED.network, updated_at = NOW()
     RETURNING *`,
    [userId, payload.walletAddress, payload.network || null]
  );
  return rows[0] || null;
}

async function getWalletBinding(client, userId) {
  const { rows } = await q(client).query('SELECT * FROM user_wallet_bindings WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

async function createDepositRequest(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO wallet_deposit_requests (user_id, amount, method, instructions, details, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      payload.userId,
      payload.amount,
      payload.method || 'manual',
      payload.instructions || null,
      payload.details || {},
      payload.status || 'pending'
    ]
  );
  return rows[0] || null;
}

async function listDepositRequests(client, userId, limit = 200) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM wallet_deposit_requests
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function createWithdrawalRequest(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO wallet_withdrawal_requests (user_id, amount, wallet_address, network, notes, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      payload.userId,
      payload.amount,
      payload.walletAddress,
      payload.network || null,
      payload.notes || null,
      payload.status || 'pending'
    ]
  );
  return rows[0] || null;
}

async function listWithdrawalRequests(client, userId, limit = 200) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM wallet_withdrawal_requests
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function createP2pTransfer(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO wallet_p2p_transfers (from_user_id, to_user_id, amount, notes, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      payload.fromUserId,
      payload.toUserId,
      payload.amount,
      payload.notes || null,
      payload.status || 'completed'
    ]
  );
  return rows[0] || null;
}

async function listP2pTransfers(client, userId, limit = 200) {
  const { rows } = await q(client).query(
    `SELECT t.*,
            fu.username AS from_username,
            tu.username AS to_username
     FROM wallet_p2p_transfers t
     JOIN users fu ON fu.id = t.from_user_id
     JOIN users tu ON tu.id = t.to_user_id
     WHERE t.from_user_id = $1 OR t.to_user_id = $1
     ORDER BY t.created_at DESC
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
  listTransactions,
  listTransactionsBySource,
  upsertWalletBinding,
  getWalletBinding,
  createDepositRequest,
  listDepositRequests,
  createWithdrawalRequest,
  listWithdrawalRequests,
  createP2pTransfer,
  listP2pTransfers
};
