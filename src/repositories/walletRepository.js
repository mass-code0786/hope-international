function q(client) {
  return client || require('../db/pool').pool;
}

const { getCacheEntry, setCacheEntry } = require('../utils/runtimeCache');

async function getTableColumns(client, tableName) {
  const cacheKey = `wallet-repo:columns:${tableName}`;
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

async function getWalletTransferColumns(client) {
  return {
    deposit_wallet: 'deposit_balance',
    income_wallet: 'income_balance',
    bonus_wallet: 'auction_bonus_balance'
  };
}

function getWalletFreezeColumn(walletType) {
  return {
    deposit_wallet: 'deposit_wallet_frozen',
    income_wallet: 'income_wallet_frozen',
    bonus_wallet: 'bonus_wallet_frozen'
  }[walletType] || null;
}

function withPaging(limit = 20, offset = 0) {
  return {
    limit: Math.max(1, Number(limit) || 20),
    offset: Math.max(0, Number(offset) || 0)
  };
}

async function createWallet(client, userId) {
  await q(client).query(
    `INSERT INTO wallets (user_id, balance, income_balance, deposit_balance, auction_bonus_balance, btct_balance, btct_locked_balance)
     VALUES ($1, 0, 0, 0, 0, 0, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function getWallet(client, userId) {
  const { rows } = await q(client).query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

async function getWalletForUpdate(client, userId) {
  const { rows } = await q(client).query('SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
  return rows[0] || null;
}

async function adjustIncomeBalance(client, userId, amountDelta) {
  const { rows } = await q(client).query(
    `UPDATE wallets
     SET income_balance = COALESCE(income_balance, 0) + $2,
         balance = COALESCE(income_balance, 0) + $2 + COALESCE(deposit_balance, 0)
     WHERE user_id = $1
     RETURNING *`,
    [userId, amountDelta]
  );
  return rows[0] || null;
}

async function adjustDepositBalance(client, userId, amountDelta) {
  const { rows } = await q(client).query(
    `UPDATE wallets
     SET deposit_balance = COALESCE(deposit_balance, 0) + $2,
         balance = COALESCE(income_balance, 0) + COALESCE(deposit_balance, 0) + $2
     WHERE user_id = $1
     RETURNING *`,
    [userId, amountDelta]
  );
  return rows[0] || null;
}

async function adjustAuctionBonusBalance(client, userId, amountDelta) {
  const { rows } = await q(client).query(
    `UPDATE wallets
     SET auction_bonus_balance = COALESCE(auction_bonus_balance, 0) + $2
     WHERE user_id = $1
     RETURNING *`,
    [userId, amountDelta]
  );
  return rows[0] || null;
}

async function debitCombinedBalanceIfSufficient(client, userId, amount) {
  const { rows } = await q(client).query(
    `WITH current_wallet AS (
        SELECT user_id,
               COALESCE(income_balance, balance, 0)::numeric(14,2) AS income_balance,
               COALESCE(deposit_balance, 0)::numeric(14,2) AS deposit_balance
        FROM wallets
        WHERE user_id = $1
        FOR UPDATE
      ),
      updated_wallet AS (
        UPDATE wallets w
        SET deposit_balance = CASE
              WHEN current_wallet.deposit_balance >= $2 THEN current_wallet.deposit_balance - $2
              ELSE 0
            END,
            income_balance = CASE
              WHEN current_wallet.deposit_balance >= $2 THEN current_wallet.income_balance
              ELSE current_wallet.income_balance - ($2 - current_wallet.deposit_balance)
            END,
            balance = current_wallet.income_balance + current_wallet.deposit_balance - $2
        FROM current_wallet
        WHERE w.user_id = current_wallet.user_id
          AND current_wallet.income_balance + current_wallet.deposit_balance >= $2
        RETURNING w.*, current_wallet.income_balance AS previous_income_balance, current_wallet.deposit_balance AS previous_deposit_balance
      )
      SELECT *,
             previous_income_balance - income_balance AS debited_income_balance,
             previous_deposit_balance - deposit_balance AS debited_deposit_balance
      FROM updated_wallet`,
    [userId, amount]
  );
  return rows[0] || null;
}

async function debitIncomeBalanceIfSufficient(client, userId, amount) {
  const { rows } = await q(client).query(
    `WITH current_wallet AS (
        SELECT user_id,
               COALESCE(income_balance, balance, 0)::numeric(14,2) AS income_balance
        FROM wallets
        WHERE user_id = $1
        FOR UPDATE
      ),
      updated_wallet AS (
        UPDATE wallets w
        SET income_balance = current_wallet.income_balance - $2,
            balance = (current_wallet.income_balance - $2) + COALESCE(w.deposit_balance, 0)
        FROM current_wallet
        WHERE w.user_id = current_wallet.user_id
          AND current_wallet.income_balance >= $2
        RETURNING w.*, current_wallet.income_balance AS previous_income_balance
      )
      SELECT *,
             previous_income_balance - income_balance AS debited_income_balance
      FROM updated_wallet`,
    [userId, amount]
  );
  return rows[0] || null;
}

async function debitAuctionBalanceIfSufficient(client, userId, amount) {
  const { rows } = await q(client).query(
    `WITH current_wallet AS (
        SELECT user_id,
               COALESCE(income_balance, balance, 0)::numeric(14,2) AS income_balance,
               COALESCE(deposit_balance, 0)::numeric(14,2) AS deposit_balance,
               COALESCE(auction_bonus_balance, 0)::numeric(14,2) AS auction_bonus_balance
        FROM wallets
        WHERE user_id = $1
        FOR UPDATE
      ),
      updated_wallet AS (
        UPDATE wallets w
        SET auction_bonus_balance = CASE
              WHEN current_wallet.auction_bonus_balance >= $2 THEN current_wallet.auction_bonus_balance - $2
              ELSE 0
            END,
            deposit_balance = CASE
              WHEN current_wallet.auction_bonus_balance >= $2 THEN current_wallet.deposit_balance
              WHEN current_wallet.auction_bonus_balance + current_wallet.deposit_balance >= $2 THEN current_wallet.deposit_balance - ($2 - current_wallet.auction_bonus_balance)
              ELSE 0
            END,
            income_balance = CASE
              WHEN current_wallet.auction_bonus_balance + current_wallet.deposit_balance >= $2 THEN current_wallet.income_balance
              ELSE current_wallet.income_balance - ($2 - current_wallet.auction_bonus_balance - current_wallet.deposit_balance)
            END,
            balance = current_wallet.income_balance + current_wallet.deposit_balance - (
              CASE
                WHEN current_wallet.auction_bonus_balance >= $2 THEN 0
                ELSE $2 - current_wallet.auction_bonus_balance
              END
            )
        FROM current_wallet
        WHERE w.user_id = current_wallet.user_id
          AND current_wallet.auction_bonus_balance + current_wallet.income_balance + current_wallet.deposit_balance >= $2
        RETURNING w.*,
                  current_wallet.income_balance AS previous_income_balance,
                  current_wallet.deposit_balance AS previous_deposit_balance,
                  current_wallet.auction_bonus_balance AS previous_auction_bonus_balance
      )
      SELECT *,
             previous_income_balance - income_balance AS debited_income_balance,
             previous_deposit_balance - deposit_balance AS debited_deposit_balance,
             previous_auction_bonus_balance - auction_bonus_balance AS debited_auction_bonus_balance
      FROM updated_wallet`,
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

async function adjustBtctLockedBalance(client, userId, amountDelta) {
  const { rows } = await q(client).query(
    `UPDATE wallets
     SET btct_locked_balance = COALESCE(btct_locked_balance, 0) + $2
     WHERE user_id = $1
       AND COALESCE(btct_balance, 0) >= COALESCE(btct_locked_balance, 0) + $2
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
    `INSERT INTO wallet_transactions (user_id, tx_type, source, amount, reference_id, metadata, created_by_admin_id, from_wallet, to_wallet, status, reference_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      payload.userId,
      payload.txType,
      payload.source,
      payload.amount,
      payload.referenceId || null,
      payload.metadata || {},
      payload.createdByAdminId || null,
      payload.fromWallet || null,
      payload.toWallet || null,
      payload.status || 'success',
      payload.referenceCode || null
    ]
  );
  return rows[0];
}

async function transferBetweenWallets(client, userId, fromWallet, toWallet, amount) {
  const walletColumns = await getWalletTransferColumns(client);
  const fromColumn = walletColumns[fromWallet];
  const toColumn = walletColumns[toWallet];

  if (!fromColumn || !toColumn) {
    throw new Error('Unsupported wallet transfer mapping');
  }

  const { rows } = await q(client).query(
    `WITH current_wallet AS (
        SELECT user_id,
               COALESCE(income_balance, 0)::numeric(14,2) AS income_balance,
               COALESCE(deposit_balance, 0)::numeric(14,2) AS deposit_balance,
               COALESCE(auction_bonus_balance, 0)::numeric(14,2) AS bonus_balance
        FROM wallets
        WHERE user_id = $1
        FOR UPDATE
      ),
      updated_wallet AS (
        UPDATE wallets w
        SET ${fromColumn} = CASE
              WHEN '${fromColumn}' = '${toColumn}' THEN ${fromColumn}
              ELSE COALESCE(w.${fromColumn}, 0) - $2
            END,
            ${toColumn} = COALESCE(w.${toColumn}, 0) + $2,
            balance = (
              CASE WHEN '${fromColumn}' = 'income_balance' THEN current_wallet.income_balance - $2
                   WHEN '${toColumn}' = 'income_balance' THEN current_wallet.income_balance + $2
                   ELSE current_wallet.income_balance
              END
            ) + (
              CASE WHEN '${fromColumn}' = 'deposit_balance' THEN current_wallet.deposit_balance - $2
                   WHEN '${toColumn}' = 'deposit_balance' THEN current_wallet.deposit_balance + $2
                   ELSE current_wallet.deposit_balance
              END
            )
        FROM current_wallet
        WHERE w.user_id = current_wallet.user_id
          AND CASE
                WHEN $3 = 'income_wallet' THEN current_wallet.income_balance
                WHEN $3 = 'deposit_wallet' THEN current_wallet.deposit_balance
                WHEN $3 = 'bonus_wallet' THEN current_wallet.bonus_balance
                ELSE 0
              END >= $2
        RETURNING w.*,
                  current_wallet.income_balance AS previous_income_balance,
                  current_wallet.deposit_balance AS previous_deposit_balance,
                  current_wallet.bonus_balance AS previous_bonus_balance
      )
      SELECT *,
             previous_income_balance - COALESCE(income_balance, 0) AS debited_income_balance,
             previous_deposit_balance - COALESCE(deposit_balance, 0) AS debited_deposit_balance,
             previous_bonus_balance - COALESCE(auction_bonus_balance, 0) AS debited_bonus_balance
      FROM updated_wallet`,
    [userId, amount, fromWallet]
  );
  return rows[0] || null;
}

async function adjustWalletBalance(client, userId, walletType, amountDelta, options = {}) {
  const walletColumns = await getWalletTransferColumns(client);
  const targetColumn = walletColumns[walletType];
  if (!targetColumn) {
    throw new Error('Unsupported wallet adjustment mapping');
  }

  const safeAmount = Number(amountDelta || 0);
  const enforceNonNegative = options.allowNegative !== true;
  const currentWallet = await getWalletForUpdate(client, userId);
  if (!currentWallet) return null;

  const currentIncome = Number(currentWallet.income_balance || 0);
  const currentDeposit = Number(currentWallet.deposit_balance || 0);
  const currentBonus = Number(currentWallet.auction_bonus_balance || 0);
  const currentTarget = Number(currentWallet[targetColumn] || 0);
  const nextTarget = Number((currentTarget + safeAmount).toFixed(2));

  if (enforceNonNegative && nextTarget < 0) {
    return null;
  }

  const nextIncome = targetColumn === 'income_balance' ? nextTarget : currentIncome;
  const nextDeposit = targetColumn === 'deposit_balance' ? nextTarget : currentDeposit;
  const nextBonus = targetColumn === 'auction_bonus_balance' ? nextTarget : currentBonus;

  const { rows } = await q(client).query(
    `UPDATE wallets
     SET ${targetColumn} = $2,
         balance = $3,
         auction_bonus_balance = $4
     WHERE user_id = $1
     RETURNING *`,
    [userId, nextTarget, Number((nextIncome + nextDeposit).toFixed(2)), nextBonus]
  );
  return rows[0] || null;
}

async function debitDepositBalanceIfSufficient(client, userId, amount) {
  const { rows } = await q(client).query(
    `WITH current_wallet AS (
        SELECT user_id,
               COALESCE(deposit_balance, 0)::numeric(14,2) AS deposit_balance,
               COALESCE(income_balance, 0)::numeric(14,2) AS income_balance
        FROM wallets
        WHERE user_id = $1
        FOR UPDATE
      ),
      updated_wallet AS (
        UPDATE wallets w
        SET deposit_balance = current_wallet.deposit_balance - $2,
            balance = current_wallet.income_balance + (current_wallet.deposit_balance - $2)
        FROM current_wallet
        WHERE w.user_id = current_wallet.user_id
          AND current_wallet.deposit_balance >= $2
        RETURNING w.*, current_wallet.deposit_balance AS previous_deposit_balance
      )
      SELECT *,
             previous_deposit_balance - deposit_balance AS debited_deposit_balance
      FROM updated_wallet`,
    [userId, amount]
  );
  return rows[0] || null;
}

async function setWalletFreezeStatus(client, userId, walletType, isFrozen) {
  const freezeColumn = getWalletFreezeColumn(walletType);
  if (!freezeColumn) {
    throw new Error('Unsupported wallet freeze mapping');
  }

  const { rows } = await q(client).query(
    `UPDATE wallets
     SET ${freezeColumn} = $2
     WHERE user_id = $1
     RETURNING *`,
    [userId, Boolean(isFrozen)]
  );
  return rows[0] || null;
}

async function createAdminWalletAction(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO admin_wallet_actions (admin_user_id, target_user_id, wallet_type, action_type, amount, reason, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      payload.adminUserId,
      payload.targetUserId,
      payload.walletType,
      payload.actionType,
      payload.amount ?? null,
      payload.reason || null,
      payload.metadata || {}
    ]
  );
  return rows[0] || null;
}

async function createSecurityEvent(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO security_event_logs (user_id, action_type, reason, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      payload.userId || null,
      payload.actionType,
      payload.reason,
      payload.metadata || {},
      payload.ipAddress || null
    ]
  );
  return rows[0] || null;
}

async function countRecentSecurityEvents(client, filters = {}) {
  const values = [];
  const where = [];

  if (filters.userId) {
    values.push(filters.userId);
    where.push(`user_id = $${values.length}`);
  }
  if (filters.actionType) {
    values.push(filters.actionType);
    where.push(`action_type = $${values.length}`);
  }
  if (filters.reason) {
    values.push(filters.reason);
    where.push(`reason = $${values.length}`);
  }
  if (filters.sinceSeconds) {
    values.push(Number(filters.sinceSeconds));
    where.push(`created_at >= NOW() - ($${values.length} * INTERVAL '1 second')`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await q(client).query(
    `SELECT COUNT(*)::int AS count
     FROM security_event_logs
     ${whereClause}`,
    values
  );
  return Number(rows[0]?.count || 0);
}

async function findRecentWalletTransferDuplicate(client, filters = {}) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM wallet_transactions
     WHERE user_id = $1
       AND source = 'wallet_transfer'
       AND from_wallet = $2
       AND to_wallet = $3
       AND amount = $4
       AND status = 'success'
       AND created_at >= NOW() - ($5 * INTERVAL '1 second')
     ORDER BY created_at DESC
     LIMIT 1`,
    [
      filters.userId,
      filters.fromWallet,
      filters.toWallet,
      filters.amount,
      Number(filters.withinSeconds || 30)
    ]
  );
  return rows[0] || null;
}

async function countRecentWalletTransfers(client, userId, withinSeconds = 300) {
  const { rows } = await q(client).query(
    `SELECT COUNT(*)::int AS count
     FROM wallet_transactions
     WHERE user_id = $1
       AND source = 'wallet_transfer'
       AND created_at >= NOW() - ($2 * INTERVAL '1 second')`,
    [userId, Number(withinSeconds)]
  );
  return Number(rows[0]?.count || 0);
}

async function findRecentWithdrawalDuplicate(client, filters = {}) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM wallet_withdrawal_requests
     WHERE user_id = $1
       AND amount = $2
       AND LOWER(wallet_address) = LOWER($3)
       AND status = 'pending'
       AND created_at >= NOW() - ($4 * INTERVAL '1 second')
     ORDER BY created_at DESC
     LIMIT 1`,
    [
      filters.userId,
      filters.amount,
      filters.walletAddress,
      Number(filters.withinSeconds || 300)
    ]
  );
  return rows[0] || null;
}

async function countRecentWithdrawalRequests(client, userId, withinSeconds = 900) {
  const { rows } = await q(client).query(
    `SELECT COUNT(*)::int AS count
     FROM wallet_withdrawal_requests
     WHERE user_id = $1
       AND created_at >= NOW() - ($2 * INTERVAL '1 second')`,
    [userId, Number(withinSeconds)]
  );
  return Number(rows[0]?.count || 0);
}

async function findRecentAdminWalletActionDuplicate(client, filters = {}) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM admin_wallet_actions
     WHERE admin_user_id = $1
       AND target_user_id = $2
       AND wallet_type = $3
       AND action_type = $4
       AND COALESCE(amount, 0) = COALESCE($5, 0)
       AND COALESCE(reason, '') = COALESCE($6, '')
       AND created_at >= NOW() - ($7 * INTERVAL '1 second')
     ORDER BY created_at DESC
     LIMIT 1`,
    [
      filters.adminUserId,
      filters.targetUserId,
      filters.walletType,
      filters.actionType,
      filters.amount ?? null,
      filters.reason || null,
      Number(filters.withinSeconds || 30)
    ]
  );
  return rows[0] || null;
}

async function countRecentAdminWalletActions(client, adminUserId, withinSeconds = 300) {
  const { rows } = await q(client).query(
    `SELECT COUNT(*)::int AS count
     FROM admin_wallet_actions
     WHERE admin_user_id = $1
       AND created_at >= NOW() - ($2 * INTERVAL '1 second')`,
    [adminUserId, Number(withinSeconds)]
  );
  return Number(rows[0]?.count || 0);
}

async function listAdminWalletUsers(client, filters = {}, pagination = {}) {
  const { limit, offset } = withPaging(pagination?.limit, pagination?.offset);
  const values = [];
  const where = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(
      u.username ILIKE $${values.length}
      OR u.email ILIKE $${values.length}
      OR CAST(u.id AS TEXT) ILIKE $${values.length}
    )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const selectSql = `SELECT
      u.id,
      u.username,
      u.email,
      u.is_active,
      w.deposit_balance,
      w.income_balance,
      w.auction_bonus_balance AS bonus_balance,
      w.deposit_wallet_frozen,
      w.income_wallet_frozen,
      w.bonus_wallet_frozen,
      w.updated_at AS wallet_updated_at
    FROM users u
    LEFT JOIN wallets w ON w.user_id = u.id
    ${whereClause}
    ORDER BY w.updated_at DESC NULLS LAST, u.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  const countSql = `SELECT COUNT(*)
    FROM users u
    LEFT JOIN wallets w ON w.user_id = u.id
    ${whereClause}`;

  const [listResult, countResult] = await Promise.all([
    q(client).query(selectSql, [...values, limit, offset]),
    q(client).query(countSql, values)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function getAdminWalletUser(client, userId) {
  const { rows } = await q(client).query(
    `SELECT
      u.id,
      u.username,
      u.email,
      u.is_active,
      w.*,
      w.auction_bonus_balance AS bonus_balance
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function listAdminWalletActions(client, filters = {}, pagination = {}) {
  const { limit, offset } = withPaging(pagination?.limit, pagination?.offset);
  const values = [];
  const where = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(
      tu.username ILIKE $${values.length}
      OR tu.email ILIKE $${values.length}
      OR au.username ILIKE $${values.length}
      OR CAST(a.target_user_id AS TEXT) ILIKE $${values.length}
    )`);
  }
  if (filters.walletType) {
    values.push(filters.walletType);
    where.push(`a.wallet_type = $${values.length}`);
  }
  if (filters.actionType) {
    values.push(filters.actionType);
    where.push(`a.action_type = $${values.length}`);
  }
  if (filters.userId) {
    values.push(filters.userId);
    where.push(`a.target_user_id = $${values.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const selectSql = `SELECT
      a.*,
      au.username AS admin_username,
      tu.username AS target_username,
      tu.email AS target_email
    FROM admin_wallet_actions a
    JOIN users au ON au.id = a.admin_user_id
    JOIN users tu ON tu.id = a.target_user_id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  const countSql = `SELECT COUNT(*)
    FROM admin_wallet_actions a
    JOIN users au ON au.id = a.admin_user_id
    JOIN users tu ON tu.id = a.target_user_id
    ${whereClause}`;

  const [listResult, countResult] = await Promise.all([
    q(client).query(selectSql, [...values, limit, offset]),
    q(client).query(countSql, values)
  ]);

  return {
    items: listResult.rows,
    total: Number(countResult.rows[0]?.count || 0)
  };
}

async function createDepositTeamIncomeLedgerEntry(client, payload) {
  const { rows } = await q(client).query(
    `INSERT INTO deposit_team_income_ledger (
       recipient_user_id,
       source_user_id,
       source_deposit_id,
       wallet_transaction_id,
       level_number,
       income_type,
       source_type,
       status,
       percentage_used,
       base_amount,
       credited_amount
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (source_deposit_id, recipient_user_id, income_type, level_number) DO NOTHING
     RETURNING *`,
    [
      payload.recipientUserId,
      payload.sourceUserId,
      payload.sourceDepositId,
      payload.walletTransactionId || null,
      payload.levelNumber,
      payload.incomeType,
      payload.sourceType || 'deposit',
      payload.status || 'approved',
      payload.percentageUsed,
      payload.baseAmount,
      payload.creditedAmount
    ]
  );
  return rows[0] || null;
}

async function updateDepositTeamIncomeLedgerWalletTransaction(client, ledgerId, walletTransactionId) {
  const { rows } = await q(client).query(
    `UPDATE deposit_team_income_ledger
     SET wallet_transaction_id = $2
     WHERE id = $1
     RETURNING *`,
    [ledgerId, walletTransactionId]
  );
  return rows[0] || null;
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

async function listIncomeTransactions(client, userId, limit = 200) {
  const incomeSources = ['direct_income', 'matching_income', 'reward_qualification', 'direct_deposit_income', 'level_deposit_income'];
  const { rows } = await q(client).query(
    `SELECT wt.*,
            dtil.source_user_id,
            su.username AS source_username,
            dtil.source_deposit_id,
            dtil.base_amount AS source_deposit_amount,
            dtil.level_number,
            dtil.credited_amount AS ledger_income_amount,
            dtil.income_type AS ledger_income_type,
            dtil.source_type,
            dtil.status AS ledger_status
     FROM wallet_transactions wt
     LEFT JOIN deposit_team_income_ledger dtil ON dtil.wallet_transaction_id = wt.id
     LEFT JOIN users su ON su.id = dtil.source_user_id
     WHERE wt.user_id = $1
       AND wt.tx_type = 'credit'
       AND wt.source = ANY($2::transaction_source[])
     ORDER BY wt.created_at DESC
     LIMIT $3`,
    [userId, incomeSources, limit]
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

async function getTransactionBySourceAndReference(client, userId, source, referenceId) {
  const { rows } = await q(client).query(
    `SELECT *
     FROM wallet_transactions
     WHERE user_id = $1
       AND source = $2
       AND reference_id = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, source, referenceId]
  );
  return rows[0] || null;
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
  const columns = await getTableColumns(client, 'wallet_deposit_requests');
  const fieldNames = [];
  const placeholders = [];
  const values = [];

  function addField(column, value, options = {}) {
    if (!columns.has(column)) return;
    values.push(value);
    fieldNames.push(column);
    placeholders.push(options.castJsonb ? `$${values.length}::jsonb` : `$${values.length}`);
  }

  addField('user_id', payload.userId);
  addField('asset', payload.asset || 'USDT');
  addField('network', payload.network || 'BEP20');
  addField('wallet_address_snapshot', payload.walletAddressSnapshot || null);
  addField('amount', payload.amount);
  addField('transaction_hash', payload.transactionHash || null);
  addField('proof_image_url', payload.proofImageUrl || null);
  addField('method', payload.method || 'crypto');
  addField('instructions', payload.instructions || null);
  addField('details', JSON.stringify(payload.details || {}), { castJsonb: true });
  addField('status', payload.status || 'pending');

  const { rows } = await q(client).query(
    `INSERT INTO wallet_deposit_requests (${fieldNames.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function getDepositRequestById(client, id, options = {}) {
  const lockClause = options.forUpdate ? ' FOR UPDATE' : '';
  const { rows } = await q(client).query(
    `SELECT d.*, u.username, u.email
     FROM wallet_deposit_requests d
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1${lockClause}`,
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
  const columns = await getTableColumns(client, 'wallet_deposit_requests');
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
    const searchTerms = [
      `u.username ILIKE $${values.length}` ,
      `u.email ILIKE $${values.length}` ,
      `CAST(d.id AS TEXT) ILIKE $${values.length}`
    ];

    if (columns.has('transaction_hash')) {
      searchTerms.push(`COALESCE(d.transaction_hash, '') ILIKE $${values.length}`);
    } else {
      searchTerms.push(`COALESCE(d.details->>'transactionReference', '') ILIKE $${values.length}`);
      searchTerms.push(`COALESCE(d.details->>'txHash', '') ILIKE $${values.length}`);
    }

    if (columns.has('wallet_address_snapshot')) {
      searchTerms.push(`COALESCE(d.wallet_address_snapshot, '') ILIKE $${values.length}`);
    } else {
      searchTerms.push(`COALESCE(d.details->>'walletAddressSnapshot', '') ILIKE $${values.length}`);
      searchTerms.push(`COALESCE(d.details->>'walletAddress', '') ILIKE $${values.length}`);
    }

    where.push(`(${searchTerms.join(' OR ')})`);
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
  const columns = await getTableColumns(client, 'wallet_deposit_requests');
  const values = [id, payload.status, JSON.stringify(payload.details || {})];
  const setClauses = [
    `status = $2`,
    `details = COALESCE(details, '{}'::jsonb) || $3::jsonb`,
    `updated_at = NOW()`
  ];

  if (columns.has('reviewed_by')) {
    values.push(payload.reviewedBy || null);
    setClauses.push(`reviewed_by = COALESCE($${values.length}::uuid, reviewed_by)`);
    if (columns.has('reviewed_at')) {
      setClauses.push(`reviewed_at = CASE WHEN $${values.length}::uuid IS NULL THEN reviewed_at ELSE NOW() END`);
    }
  }

  values.push(payload.expectedCurrentStatus || null);

  const { rows } = await q(client).query(
    `UPDATE wallet_deposit_requests
     SET ${setClauses.join(',\n         ')}
     WHERE id = $1
       AND ($${values.length}::wallet_request_status IS NULL OR status = $${values.length})
     RETURNING *`,
    values
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
  const incomeSources = ['direct_income', 'matching_income', 'reward_qualification', 'direct_deposit_income', 'level_deposit_income'];

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
  getWalletForUpdate,
  adjustIncomeBalance,
  adjustDepositBalance,
  adjustAuctionBonusBalance,
  adjustWalletBalance,
  setWalletFreezeStatus,
  debitCombinedBalanceIfSufficient,
  debitDepositBalanceIfSufficient,
  debitIncomeBalanceIfSufficient,
  debitAuctionBalanceIfSufficient,
  adjustBtctBalance,
  adjustBtctLockedBalance,
  createBtctTransaction,
  transferBetweenWallets,
  createAdminWalletAction,
  createSecurityEvent,
  countRecentSecurityEvents,
  findRecentWalletTransferDuplicate,
  countRecentWalletTransfers,
  findRecentWithdrawalDuplicate,
  countRecentWithdrawalRequests,
  findRecentAdminWalletActionDuplicate,
  countRecentAdminWalletActions,
  listAdminWalletUsers,
  getAdminWalletUser,
  listAdminWalletActions,
  listBtctTransactions,
  createTransaction,
  createDepositTeamIncomeLedgerEntry,
  updateDepositTeamIncomeLedgerWalletTransaction,
  listTransactions,
  listIncomeTransactions,
  listTransactionsBySource,
  getTransactionBySourceAndReference,
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



