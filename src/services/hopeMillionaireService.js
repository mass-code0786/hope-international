const { withTransaction } = require('../db/pool');
const hopeMillionaireRepository = require('../repositories/hopeMillionaireRepository');
const walletRepository = require('../repositories/walletRepository');
const userRepository = require('../repositories/userRepository');
const walletService = require('./walletService');
const { ApiError } = require('../utils/ApiError');

const MATRIX_SIZE = 3;
const UPLINE_LEVELS = 4;
const AUTOMATIC_REENTRY_COUNT = 2;
const PACKAGE_CONFIG = Object.freeze({
  3: Object.freeze({ amount: 3, collection: 9, reentryAmount: 6, memberIncome: 2, uplineTotal: 1, uplineIncome: 0.25, incomeCap: 9 }),
  10: Object.freeze({ amount: 10, collection: 30, reentryAmount: 20, memberIncome: 6, uplineTotal: 4, uplineIncome: 1, incomeCap: 30 }),
  25: Object.freeze({ amount: 25, collection: 75, reentryAmount: 50, memberIncome: 17, uplineTotal: 8, uplineIncome: 2, incomeCap: 75 })
});
const PACKAGE_AMOUNTS = Object.freeze(Object.keys(PACKAGE_CONFIG).map(Number));

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function getPackageConfig(packageAmount) {
  const config = PACKAGE_CONFIG[Number(packageAmount)];
  if (!config) throw new ApiError(400, `Package must be one of ${PACKAGE_AMOUNTS.join(', ')}`);
  return config;
}

async function syncReferralReactivation(client, userId, packageAmount) {
  const state = await hopeMillionaireRepository.getPackageState(client, userId, packageAmount, { forUpdate: true });
  if (!state || state.is_active || !state.inactive_at) return state;

  const referral = await hopeMillionaireRepository.findQualifyingReferral(client, userId, state.inactive_at);
  if (!referral) return state;

  return hopeMillionaireRepository.activatePackage(client, userId, packageAmount, {
    hasPurchased: state.has_purchased,
    reason: 'direct_referral',
    referralId: referral.id
  });
}

async function recordTransaction(client, payload) {
  const existing = await hopeMillionaireRepository.getTransactionByEventKey(client, payload.eventKey);
  if (existing) return existing;
  return hopeMillionaireRepository.createTransaction(client, payload);
}

async function creditIncome(client, payload) {
  const existing = await hopeMillionaireRepository.getTransactionByEventKey(client, payload.eventKey);
  if (existing) return existing;

  const credited = await walletService.creditWithTransaction(
    client,
    payload.userId,
    payload.amount,
    payload.walletSource,
    payload.entryId,
    {
      walletType: 'income',
      hopeMillionaire: true,
      packageAmount: payload.packageAmount,
      transactionType: payload.transactionType,
      sourceUserId: payload.sourceUserId || null,
      uplineLevel: payload.uplineLevel || null,
      eventKey: payload.eventKey
    }
  );

  await hopeMillionaireRepository.addEarnings(
    client,
    payload.userId,
    payload.packageAmount,
    payload.amount,
    getPackageConfig(payload.packageAmount).incomeCap
  );

  return hopeMillionaireRepository.createTransaction(client, {
    ...payload,
    walletTransactionId: credited.transaction.id
  });
}

async function settleCompletedEntry(client, completedEntry) {
  const config = getPackageConfig(completedEntry.package_amount);
  await creditIncome(client, {
    userId: completedEntry.user_id,
    entryId: completedEntry.id,
    packageAmount: config.amount,
    transactionType: 'member_income',
    amount: config.memberIncome,
    sourceUserId: completedEntry.user_id,
    walletSource: 'hope_millionaire_member_income',
    eventKey: `hope-millionaire:member:${completedEntry.id}`
  });

  const uplines = await userRepository.getSponsorUpline(client, completedEntry.user_id, UPLINE_LEVELS);
  for (const upline of uplines.slice(0, UPLINE_LEVELS)) {
    await creditIncome(client, {
      userId: upline.id,
      entryId: completedEntry.id,
      packageAmount: config.amount,
      transactionType: 'upline_income',
      amount: config.uplineIncome,
      sourceUserId: completedEntry.user_id,
      uplineLevel: Number(upline.level_number),
      walletSource: 'hope_millionaire_upline_income',
      eventKey: `hope-millionaire:upline:${completedEntry.id}:${upline.level_number}`
    });
  }
}

async function createAutomaticReentries(client, completedEntry) {
  const entries = [];
  for (let index = 1; index <= AUTOMATIC_REENTRY_COUNT; index += 1) {
    const eventKey = `hope-millionaire:reentry:${completedEntry.id}:${index}`;
    const existing = await hopeMillionaireRepository.getTransactionByEventKey(client, eventKey);
    if (existing) continue;

    const entry = await hopeMillionaireRepository.createEntry(client, {
      userId: completedEntry.user_id,
      packageAmount: Number(completedEntry.package_amount),
      entrySource: 'automatic_reentry'
    });
    await recordTransaction(client, {
      userId: completedEntry.user_id,
      entryId: entry.id,
      packageAmount: Number(completedEntry.package_amount),
      transactionType: 'automatic_reentry',
      amount: Number(completedEntry.package_amount),
      sourceUserId: completedEntry.user_id,
      eventKey,
      metadata: { completedEntryId: completedEntry.id, reentryNumber: index }
    });
    entries.push(entry);
  }
  return entries;
}

async function placeEntries(client, initialEntries, packageAmount) {
  const queue = [...initialEntries];
  const placements = [];

  while (queue.length) {
    const entry = queue.shift();
    const parent = await hopeMillionaireRepository.findOpenParent(client, packageAmount, entry.id);
    if (!parent) {
      placements.push({ entryId: entry.id, parentEntryId: null, slotPosition: null });
      continue;
    }

    const slotPosition = Number(parent.filled_slots) + 1;
    const placed = await hopeMillionaireRepository.placeEntry(client, entry.id, parent.id, slotPosition);
    if (!placed) throw new ApiError(409, 'Hope Millionaire entry was already placed');

    const updatedParent = await hopeMillionaireRepository.incrementParentFill(client, parent.id);
    if (!updatedParent) throw new ApiError(409, 'Hope Millionaire parent entry is no longer available');
    placements.push({ entryId: entry.id, parentEntryId: parent.id, slotPosition });

    if (Number(updatedParent.filled_slots) === MATRIX_SIZE) {
      await settleCompletedEntry(client, updatedParent);
      const reentries = await createAutomaticReentries(client, updatedParent);
      queue.push(...reentries);
    }
  }

  return placements;
}

async function getDashboardWithClient(client, userId, options = {}) {
  if (options.syncReactivation !== false) {
    for (const packageAmount of PACKAGE_AMOUNTS) {
      await hopeMillionaireRepository.acquirePackageLock(client, packageAmount);
      await syncReferralReactivation(client, userId, packageAmount);
    }
  }

  const [states, entries, reentryCounts, transactions] = await Promise.all([
    hopeMillionaireRepository.listPackageStates(client, userId),
    hopeMillionaireRepository.listCurrentEntries(client, userId),
    hopeMillionaireRepository.listAutomaticReentryCounts(client, userId),
    hopeMillionaireRepository.listTransactions(client, userId, 30)
  ]);
  const statesByAmount = new Map(states.map((state) => [Number(state.package_amount), state]));
  const entriesByAmount = new Map(entries.map((entry) => [Number(entry.package_amount), entry]));
  const reentryCountsByAmount = new Map(reentryCounts.map((row) => [Number(row.package_amount), Number(row.reentry_count)]));

  return {
    packages: PACKAGE_AMOUNTS.map((amount) => {
      const config = getPackageConfig(amount);
      const state = statesByAmount.get(amount);
      const entry = entriesByAmount.get(amount);
      const filledSlots = Number(entry?.filled_slots || 0);
      return {
        ...config,
        status: state?.is_active ? 'active' : 'inactive',
        isActive: Boolean(state?.is_active),
        hasPurchased: Boolean(state?.has_purchased),
        periodEarnings: toMoney(state?.period_earnings || 0),
        lifetimeEarnings: toMoney(state?.lifetime_earnings || 0),
        inactiveAt: state?.inactive_at || null,
        reactivationReason: state?.reactivation_reason || null,
        currentEntryId: entry?.id || null,
        filledSlots,
        fillLabel: `${filledSlots}/3`,
        reentryCount: reentryCountsByAmount.get(amount) || 0
      };
    }),
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      packageAmount: Number(transaction.package_amount),
      type: transaction.transaction_type,
      amount: toMoney(transaction.amount),
      sourceUsername: transaction.source_username || null,
      uplineLevel: transaction.upline_level ? Number(transaction.upline_level) : null,
      createdAt: transaction.created_at
    }))
  };
}

async function getDashboard(userId) {
  return withTransaction((client) => getDashboardWithClient(client, userId));
}

async function joinPackage(userId, payload = {}) {
  return withTransaction(async (client) => {
    const config = getPackageConfig(payload.packageAmount);
    await hopeMillionaireRepository.acquirePackageLock(client, config.amount);
    await hopeMillionaireRepository.acquireUserLock(client, userId);

    if (payload.requestId) {
      const duplicateEntry = await hopeMillionaireRepository.findEntryByRequestId(client, userId, payload.requestId);
      if (duplicateEntry) {
        return { ...(await getDashboardWithClient(client, userId, { syncReactivation: false })), duplicateRequest: true };
      }
    }

    const state = await syncReferralReactivation(client, userId, config.amount);

    const entry = await hopeMillionaireRepository.createEntry(client, {
      userId,
      packageAmount: config.amount,
      entrySource: 'purchase',
      requestId: payload.requestId || null
    });

    await walletService.debit(
      client,
      userId,
      config.amount,
      'hope_millionaire_purchase',
      entry.id,
      {
        walletType: 'spendable',
        hopeMillionaire: true,
        packageAmount: config.amount,
        requestId: payload.requestId || null
      }
    );
    const walletTransaction = await walletRepository.getTransactionBySourceAndReference(
      client,
      userId,
      'hope_millionaire_purchase',
      entry.id
    );

    const purchasedAt = new Date().toISOString();
    if (state?.is_active) {
      await hopeMillionaireRepository.recordAdditionalPurchase(client, userId, config.amount, purchasedAt);
    } else {
      await hopeMillionaireRepository.activatePackage(client, userId, config.amount, {
        hasPurchased: true,
        lastPurchaseAt: purchasedAt,
        reason: state ? 'repurchase' : 'purchase'
      });
    }
    await recordTransaction(client, {
      userId,
      entryId: entry.id,
      packageAmount: config.amount,
      transactionType: 'purchase',
      amount: config.amount,
      sourceUserId: userId,
      walletTransactionId: walletTransaction?.id || null,
      eventKey: `hope-millionaire:purchase:${entry.id}`,
      metadata: { requestId: payload.requestId || null }
    });

    const placements = await placeEntries(client, [entry], config.amount);
    return {
      ...(await getDashboardWithClient(client, userId, { syncReactivation: false })),
      duplicateRequest: false,
      joinedPackage: config.amount,
      placements
    };
  });
}

module.exports = {
  PACKAGE_CONFIG,
  PACKAGE_AMOUNTS,
  AUTOMATIC_REENTRY_COUNT,
  getDashboard,
  joinPackage
};
