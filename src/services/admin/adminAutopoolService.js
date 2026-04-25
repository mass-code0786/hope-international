const { withTransaction } = require('../../db/pool');
const autopoolRepository = require('../../repositories/autopoolRepository');
const adminRepository = require('../../repositories/adminRepository');
const { ApiError } = require('../../utils/ApiError');

const AUTOPOOL_RESET_CONFIRMATION = 'RESET_AUTOPOOL';
const AUTOPOOL_WALLET_SOURCES = Object.freeze([
  'autopool_entry',
  'autopool_matrix_income',
  'sponsor_pool_income',
  'autopool_upline_income',
  'autopool_bonus_share',
  'autopool_auction_share'
]);
const AUTOPOOL_TREE_TABLES = Object.freeze(['autopool_children', 'autopool_matrix']);
const AUTOPOOL_OPTIONAL_TABLES = Object.freeze(['autopool_cycles']);

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeMoney(value) {
  return toMoney(value);
}

function getObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeWalletType(value) {
  const normalized = normalizeText(value);
  if (['income', 'income_wallet', 'earning', 'earning_wallet'].includes(normalized)) return 'income';
  if (['deposit', 'deposit_wallet'].includes(normalized)) return 'deposit';
  if (['bonus', 'bonus_wallet', 'auction_bonus'].includes(normalized)) return 'bonus';
  if (['withdrawal', 'withdrawal_wallet'].includes(normalized)) return 'withdrawal';
  if (normalized === 'spendable') return 'spendable';
  if (normalized === 'transfer') return 'transfer';
  if (normalized === 'auction_entry') return 'auction_entry';
  return null;
}

function resolveCreditWalletType(source, metadata = {}) {
  const requestedWalletType = normalizeWalletType(metadata.walletType);
  if (requestedWalletType && !['spendable', 'transfer', 'auction_entry'].includes(requestedWalletType)) {
    return requestedWalletType;
  }

  const normalizedSource = normalizeText(source);
  if (normalizedSource === 'deposit_request') return 'deposit';
  if (normalizedSource === 'admin_credit') return 'deposit';
  if (normalizedSource === 'auction_win_cash') return 'withdrawal';
  if (normalizedSource === 'btct_staking_payout') return 'income';
  if (['direct_income', 'matching_income', 'reward_qualification', 'direct_deposit_income', 'level_deposit_income'].includes(normalizedSource)) {
    return 'income';
  }
  if (normalizedSource === 'p2p_transfer' && normalizeText(metadata.direction) === 'in') {
    return 'deposit';
  }
  if (normalizedSource === 'welcome_spin_bonus') return 'bonus';
  return 'income';
}

function normalizeWalletBreakdown(metadata = {}) {
  const breakdown = getObject(metadata.walletBreakdown);
  return {
    income: normalizeMoney(breakdown.income),
    deposit: normalizeMoney(breakdown.deposit),
    bonus: normalizeMoney(breakdown.bonus ?? breakdown.auctionBonus),
    withdrawal: normalizeMoney(breakdown.withdrawal)
  };
}

function addBalance(balance, walletType, amountDelta) {
  const amount = toMoney(amountDelta);
  if (!amount || !walletType || !['income', 'deposit', 'bonus', 'withdrawal'].includes(walletType)) {
    return;
  }

  const key = `${walletType}Balance`;
  balance[key] = toMoney((balance[key] || 0) + amount);
}

function buildEmptyBalance() {
  return {
    incomeBalance: 0,
    depositBalance: 0,
    bonusBalance: 0,
    withdrawalBalance: 0
  };
}

function getBalanceRecord(map, userId) {
  if (!map.has(userId)) {
    map.set(userId, buildEmptyBalance());
  }
  return map.get(userId);
}

function applyCredit(balance, transaction) {
  const walletType = resolveCreditWalletType(transaction.source, transaction.metadata);
  addBalance(balance, walletType, transaction.amount);
}

function applyDebit(balance, transaction) {
  const metadata = getObject(transaction.metadata);
  const breakdown = normalizeWalletBreakdown(metadata);
  const hasBreakdown = Object.values(breakdown).some((value) => value > 0);

  if (hasBreakdown) {
    addBalance(balance, 'income', breakdown.income * -1);
    addBalance(balance, 'deposit', breakdown.deposit * -1);
    addBalance(balance, 'bonus', breakdown.bonus * -1);
    addBalance(balance, 'withdrawal', breakdown.withdrawal * -1);
  } else {
    addBalance(balance, normalizeWalletType(transaction.from_wallet) || normalizeWalletType(metadata.walletType), transaction.amount * -1);
  }

  if (normalizeText(transaction.source) === 'wallet_transfer' && normalizeText(transaction.status || 'success') === 'success') {
    addBalance(balance, normalizeWalletType(transaction.to_wallet), transaction.amount);
  }
}

function calculateWalletBalances(userIds = [], transactions = []) {
  const balancesByUserId = new Map();

  for (const userId of userIds) {
    getBalanceRecord(balancesByUserId, userId);
  }

  for (const transaction of transactions) {
    const balance = getBalanceRecord(balancesByUserId, transaction.user_id);
    if (normalizeText(transaction.tx_type) === 'credit') {
      applyCredit(balance, transaction);
    } else if (normalizeText(transaction.tx_type) === 'debit') {
      applyDebit(balance, transaction);
    }
  }

  return balancesByUserId;
}

async function tableExists(client, tableName) {
  const { rows } = await client.query('SELECT to_regclass($1) AS table_ref', [`public.${tableName}`]);
  return Boolean(rows[0]?.table_ref);
}

async function deleteTableRowsIfPresent(client, tableName) {
  if (!(await tableExists(client, tableName))) {
    return 0;
  }

  const { rowCount } = await client.query(`DELETE FROM ${tableName}`);
  return rowCount;
}

async function deleteAutopoolNotifications(client) {
  if (!(await tableExists(client, 'user_notifications'))) {
    return 0;
  }

  const { rowCount } = await client.query(`DELETE FROM user_notifications WHERE type = 'autopool'`);
  return rowCount;
}

async function deleteAutopoolWalletTransactions(client) {
  const { rows } = await client.query(
    `DELETE FROM wallet_transactions
     WHERE source::text = ANY($1::text[])
        OR (
          source::text = 'manual_adjustment'
          AND (
            metadata->>'cleanupKind' = 'autopool_sponsor_income_reversal'
            OR metadata ? 'repairedFromAutopoolTransactionId'
            OR metadata->>'source' = 'autopool'
          )
        )
     RETURNING user_id`,
    [AUTOPOOL_WALLET_SOURCES]
  );

  const affectedUserIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];

  return {
    deletedCount: rows.length,
    affectedUserIds
  };
}

async function listRemainingWalletTransactions(client, userIds = []) {
  if (!userIds.length) {
    return [];
  }

  const { rows } = await client.query(
    `SELECT
       user_id,
       tx_type,
       source::text AS source,
       amount,
       metadata,
       from_wallet,
       to_wallet,
       status
     FROM wallet_transactions
     WHERE user_id = ANY($1::uuid[])
     ORDER BY created_at ASC, id ASC`,
    [userIds]
  );

  return rows.map((row) => ({
    ...row,
    amount: toMoney(row.amount),
    metadata: getObject(row.metadata)
  }));
}

async function ensureWalletRows(client, userIds = []) {
  if (!userIds.length) {
    return;
  }

  await client.query(
    `INSERT INTO wallets (user_id, balance, income_balance, deposit_balance, auction_bonus_balance, btct_balance, btct_locked_balance)
     SELECT user_id, 0, 0, 0, 0, 0, 0
     FROM UNNEST($1::uuid[]) AS input(user_id)
     ON CONFLICT (user_id) DO NOTHING`,
    [userIds]
  );
}

async function applyWalletRecalculation(client, balancesByUserId) {
  const userIds = [];
  const incomeBalances = [];
  const depositBalances = [];
  const bonusBalances = [];

  for (const [userId, balance] of balancesByUserId.entries()) {
    userIds.push(userId);
    incomeBalances.push(toMoney(balance.incomeBalance));
    depositBalances.push(toMoney(balance.depositBalance));
    bonusBalances.push(toMoney(balance.bonusBalance));
  }

  if (!userIds.length) {
    return 0;
  }

  await ensureWalletRows(client, userIds);

  const { rowCount } = await client.query(
    `WITH recalculated AS (
       SELECT *
       FROM UNNEST(
         $1::uuid[],
         $2::numeric[],
         $3::numeric[],
         $4::numeric[]
       ) AS t(user_id, income_balance, deposit_balance, auction_bonus_balance)
     )
     UPDATE wallets w
     SET income_balance = recalculated.income_balance,
         deposit_balance = recalculated.deposit_balance,
         auction_bonus_balance = recalculated.auction_bonus_balance,
         balance = recalculated.income_balance + recalculated.deposit_balance
     FROM recalculated
     WHERE w.user_id = recalculated.user_id`,
    [userIds, incomeBalances, depositBalances, bonusBalances]
  );

  return rowCount;
}

async function resetAutopool(adminUserId, payload = {}) {
  if (payload.confirm !== AUTOPOOL_RESET_CONFIRMATION) {
    throw new ApiError(400, 'Autopool reset confirmation is invalid');
  }

  return withTransaction(async (client) => {
    await autopoolRepository.acquireGlobalQueueLock(client);

    const deleted = {
      autopoolTransactions: await deleteTableRowsIfPresent(client, 'autopool_transactions'),
      autopoolQueue: await deleteTableRowsIfPresent(client, 'autopool_queue'),
      autopoolChildren: 0,
      autopoolMatrix: 0,
      autopoolCycles: 0,
      autopoolEntries: 0,
      autopoolNotifications: 0
    };

    for (const tableName of AUTOPOOL_TREE_TABLES) {
      const deletedCount = await deleteTableRowsIfPresent(client, tableName);
      if (tableName === 'autopool_children') {
        deleted.autopoolChildren = deletedCount;
      } else if (tableName === 'autopool_matrix') {
        deleted.autopoolMatrix = deletedCount;
      }
    }

    for (const tableName of AUTOPOOL_OPTIONAL_TABLES) {
      const deletedCount = await deleteTableRowsIfPresent(client, tableName);
      if (tableName === 'autopool_cycles') {
        deleted.autopoolCycles = deletedCount;
      }
    }

    deleted.autopoolEntries = await deleteTableRowsIfPresent(client, 'autopool_entries');
    deleted.autopoolNotifications = await deleteAutopoolNotifications(client);

    const walletCleanup = await deleteAutopoolWalletTransactions(client);
    const remainingTransactions = await listRemainingWalletTransactions(client, walletCleanup.affectedUserIds);
    const recalculatedBalances = calculateWalletBalances(walletCleanup.affectedUserIds, remainingTransactions);
    const recalculatedWalletCount = await applyWalletRecalculation(client, recalculatedBalances);

    await client.query(
      `DO $$
       DECLARE
         sequence_name text;
       BEGIN
         SELECT pg_get_serial_sequence('autopool_queue', 'position') INTO sequence_name;
         IF sequence_name IS NOT NULL THEN
           EXECUTE format('ALTER SEQUENCE %s RESTART WITH 1', sequence_name);
         END IF;
       END $$;`
    );

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'autopool.reset',
      targetEntity: 'autopool',
      targetId: 'global',
      beforeData: null,
      afterData: {
        success: true
      },
      metadata: {
        confirmation: AUTOPOOL_RESET_CONFIRMATION,
        deleted,
        walletTransactionsDeleted: walletCleanup.deletedCount,
        affectedUserCount: walletCleanup.affectedUserIds.length,
        recalculatedWalletCount,
        queueSequenceReset: true
      }
    });

    return {
      success: true,
      deleted,
      walletTransactionsDeleted: walletCleanup.deletedCount,
      affectedUserCount: walletCleanup.affectedUserIds.length,
      recalculatedWalletCount
    };
  });
}

module.exports = {
  AUTOPOOL_RESET_CONFIRMATION,
  resetAutopool
};
