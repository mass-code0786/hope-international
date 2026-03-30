function q(client) {
  return client || require('../db/pool').pool;
}

function withPaging(limit = 20, offset = 0) {
  return {
    limit: Math.max(1, Number(limit) || 20),
    offset: Math.max(0, Number(offset) || 0)
  };
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

async function debitBalanceIfSufficient(client, userId, amount) {
  const { rows } = await q(client).query(
    `UPDATE wallets
     SET balance = balance - $2
     WHERE user_id = $1
       AND balance >= $2
     RETURNING *`,
    [userId, amount]
  );
  return rows[0] || null;
}

async function adjustBtctBalance(client, userId, amountDelta) {
  const { rows } = await q(client).query(
    `UPDATE wallets
     SET btct_balance = COALESCE(btct_balance, 0) + $2
     WHERE user_id = $1
     RETURNING *`,
    [userId, amountDelta]
  );
  return rows[0] || null;
}

async function createBtctTransaction(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO btct_transactions (user_id, tx_type, source, amount, reference_id, metadata, created_by_admin_id)
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

async function listBtctTransactions(client, userId, limit = 50) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM btct_transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
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

async function removeWalletBinding(client, userId) {
  const { rows } = await q(client).query(
    `DELETE FROM user_wallet_bindings
     WHERE user_id = $1
     RETURNING *`,
    [userId]
  );
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

async function getDepositRequestById(client, id) {
  const { rows } = await q(client).query(
    `SELECT d.*, u.username, u.email
     FROM wallet_deposit_requests d
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1`,
    [id]
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

async function listDepositRequestsAdmin(client, filters, pagination) {
  const { limit, offset } = withPaging(pagination?.limit, pagination?.offset);
  const values = [];
  const where = [];

  if (filters?.status) {
    values.push(filters.status);
    where.push(`d.status = $${values.length}`);
  }
  if (filters?.userId) {
    values.push(filters.userId);
    where.push(`d.user_id = $${values.length}`);
  }
  if (filters?.dateFrom) {
    values.push(filters.dateFrom);
    where.push(`d.created_at >= $${values.length}::date`);
  }
  if (filters?.dateTo) {
    values.push(filters.dateTo);
    where.push(`d.created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }
  if (filters?.search) {
    values.push(`%${filters.search}%`);
    where.push(`(u.username ILIKE $${values.length} OR u.email ILIKE $${values.length} OR CAST(d.id AS TEXT) ILIKE $${values.length})`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const listSql = `SELECT d.*, u.username, u.email
                   FROM wallet_deposit_requests d
                   JOIN users u ON u.id = d.user_id
                   ${whereClause}
                   ORDER BY d.created_at DESC
                   LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  const listValues = [...values, limit, offset];
  const countSql = `SELECT COUNT(*)
                    FROM wallet_deposit_requests d
                    JOIN users u ON u.id = d.user_id
                    ${whereClause}`;

  const [listResult, countResult] = await Promise.all([
    q(client).query(listSql, listValues),
    q(client).query(countSql, values)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function updateDepositRequestStatus(client, id, payload) {
  const { rows } = await q(client).query(
    `UPDATE wallet_deposit_requests
     SET status = $2,
         details = COALESCE(details, '{}'::jsonb) || $3::jsonb,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, payload.status, payload.details || {}]
  );
  return rows[0] || null;
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

async function getWithdrawalRequestById(client, id) {
  const { rows } = await q(client).query(
    `SELECT w.*, u.username, u.email
     FROM wallet_withdrawal_requests w
     JOIN users u ON u.id = w.user_id
     WHERE w.id = $1`,
    [id]
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

async function listWithdrawalRequestsAdmin(client, filters, pagination) {
  const { limit, offset } = withPaging(pagination?.limit, pagination?.offset);
  const values = [];
  const where = [];

  if (filters?.status) {
    values.push(filters.status);
    where.push(`w.status = $${values.length}`);
  }
  if (filters?.userId) {
    values.push(filters.userId);
    where.push(`w.user_id = $${values.length}`);
  }
  if (filters?.dateFrom) {
    values.push(filters.dateFrom);
    where.push(`w.created_at >= $${values.length}::date`);
  }
  if (filters?.dateTo) {
    values.push(filters.dateTo);
    where.push(`w.created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }
  if (filters?.search) {
    values.push(`%${filters.search}%`);
    where.push(`(u.username ILIKE $${values.length} OR u.email ILIKE $${values.length} OR CAST(w.id AS TEXT) ILIKE $${values.length})`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const listSql = `SELECT w.*, u.username, u.email
                   FROM wallet_withdrawal_requests w
                   JOIN users u ON u.id = w.user_id
                   ${whereClause}
                   ORDER BY w.created_at DESC
                   LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  const listValues = [...values, limit, offset];
  const countSql = `SELECT COUNT(*)
                    FROM wallet_withdrawal_requests w
                    JOIN users u ON u.id = w.user_id
                    ${whereClause}`;

  const [listResult, countResult] = await Promise.all([
    q(client).query(listSql, listValues),
    q(client).query(countSql, values)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function updateWithdrawalRequestStatus(client, id, payload) {
  const { rows } = await q(client).query(
    `UPDATE wallet_withdrawal_requests
     SET status = $2,
         notes = CASE
           WHEN COALESCE($3, '') = '' THEN notes
           WHEN COALESCE(notes, '') = '' THEN $3
           ELSE notes || E'\\n\\nAdmin Note: ' || $3
         END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, payload.status, payload.adminNote || '']
  );
  return rows[0] || null;
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

async function listP2pTransfersAdmin(client, filters, pagination) {
  const { limit, offset } = withPaging(pagination?.limit, pagination?.offset);
  const values = [];
  const where = [];

  if (filters?.dateFrom) {
    values.push(filters.dateFrom);
    where.push(`t.created_at >= $${values.length}::date`);
  }
  if (filters?.dateTo) {
    values.push(filters.dateTo);
    where.push(`t.created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }
  if (filters?.senderId) {
    values.push(filters.senderId);
    where.push(`t.from_user_id = $${values.length}`);
  }
  if (filters?.receiverId) {
    values.push(filters.receiverId);
    where.push(`t.to_user_id = $${values.length}`);
  }
  if (filters?.search) {
    values.push(`%${filters.search}%`);
    where.push(`(
      fu.username ILIKE $${values.length}
      OR tu.username ILIKE $${values.length}
      OR CAST(t.id AS TEXT) ILIKE $${values.length}
      OR CAST(t.from_user_id AS TEXT) ILIKE $${values.length}
      OR CAST(t.to_user_id AS TEXT) ILIKE $${values.length}
    )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const listSql = `SELECT t.*, fu.username AS from_username, tu.username AS to_username
                   FROM wallet_p2p_transfers t
                   JOIN users fu ON fu.id = t.from_user_id
                   JOIN users tu ON tu.id = t.to_user_id
                   ${whereClause}
                   ORDER BY t.created_at DESC
                   LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  const listValues = [...values, limit, offset];
  const countSql = `SELECT COUNT(*)
                    FROM wallet_p2p_transfers t
                    JOIN users fu ON fu.id = t.from_user_id
                    JOIN users tu ON tu.id = t.to_user_id
                    ${whereClause}`;

  const [listResult, countResult] = await Promise.all([
    q(client).query(listSql, listValues),
    q(client).query(countSql, values)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function listWalletBindingsAdmin(client, filters, pagination) {
  const { limit, offset } = withPaging(pagination?.limit, pagination?.offset);
  const values = [];
  const where = [];

  if (filters?.userId) {
    values.push(filters.userId);
    where.push(`b.user_id = $${values.length}`);
  }
  if (filters?.search) {
    values.push(`%${filters.search}%`);
    where.push(`(
      u.username ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
      OR CAST(b.user_id AS TEXT) ILIKE $${values.length}
      OR b.wallet_address ILIKE $${values.length}
    )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const listSql = `SELECT b.*, u.username, u.email
                   FROM user_wallet_bindings b
                   JOIN users u ON u.id = b.user_id
                   ${whereClause}
                   ORDER BY b.updated_at DESC
                   LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  const listValues = [...values, limit, offset];
  const countSql = `SELECT COUNT(*)
                    FROM user_wallet_bindings b
                    JOIN users u ON u.id = b.user_id
                    ${whereClause}`;

  const [listResult, countResult] = await Promise.all([
    q(client).query(listSql, listValues),
    q(client).query(countSql, values)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function listIncomeTransactionsAdmin(client, filters, pagination) {
  const { limit, offset } = withPaging(pagination?.limit, pagination?.offset);
  const values = [];
  const where = [`wt.tx_type = 'credit'`];
  const incomeSources = ['direct_income', 'matching_income', 'reward_qualification'];

  if (filters?.source && filters.source !== 'all') {
    values.push(filters.source);
    where.push(`wt.source = $${values.length}`);
  } else {
    values.push(incomeSources);
    where.push(`wt.source = ANY($${values.length}::transaction_source[])`);
  }

  if (filters?.userId) {
    values.push(filters.userId);
    where.push(`wt.user_id = $${values.length}`);
  }
  if (filters?.dateFrom) {
    values.push(filters.dateFrom);
    where.push(`wt.created_at >= $${values.length}::date`);
  }
  if (filters?.dateTo) {
    values.push(filters.dateTo);
    where.push(`wt.created_at < ($${values.length}::date + INTERVAL '1 day')`);
  }
  if (filters?.search) {
    values.push(`%${filters.search}%`);
    where.push(`(
      u.username ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
      OR CAST(wt.user_id AS TEXT) ILIKE $${values.length}
      OR CAST(wt.id AS TEXT) ILIKE $${values.length}
    )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const listSql = `SELECT wt.*, u.username, u.email
                   FROM wallet_transactions wt
                   JOIN users u ON u.id = wt.user_id
                   ${whereClause}
                   ORDER BY wt.created_at DESC
                   LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  const listValues = [...values, limit, offset];
  const countSql = `SELECT COUNT(*)
                    FROM wallet_transactions wt
                    JOIN users u ON u.id = wt.user_id
                    ${whereClause}`;

  const [listResult, countResult] = await Promise.all([
    q(client).query(listSql, listValues),
    q(client).query(countSql, values)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

module.exports = {
  createWallet,
  getWallet,
  adjustBalance,
  debitBalanceIfSufficient,
  adjustBtctBalance,
  createBtctTransaction,
  listBtctTransactions,
  createTransaction,
  listTransactions,
  listTransactionsBySource,
  upsertWalletBinding,
  getWalletBinding,
  removeWalletBinding,
  createDepositRequest,
  getDepositRequestById,
  listDepositRequests,
  listDepositRequestsAdmin,
  updateDepositRequestStatus,
  createWithdrawalRequest,
  getWithdrawalRequestById,
  listWithdrawalRequests,
  listWithdrawalRequestsAdmin,
  updateWithdrawalRequestStatus,
  createP2pTransfer,
  listP2pTransfers,
  listP2pTransfersAdmin,
  listWalletBindingsAdmin,
  listIncomeTransactionsAdmin
};
