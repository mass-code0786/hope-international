const { withTransaction } = require('../db/pool');
const autopoolRepository = require('../repositories/autopoolRepository');
const walletRepository = require('../repositories/walletRepository');
const userRepository = require('../repositories/userRepository');
const walletService = require('./walletService');
const notificationService = require('./notificationService');
const autopoolProcessor = require('../jobs/autopoolProcessor');
const { normalizePagination, buildPagination } = require('../utils/pagination');
const { ApiError } = require('../utils/ApiError');

const DEFAULT_PACKAGE_AMOUNT = 2;
const MATRIX_SLOTS = 3;
const MATRIX_TYPE = '1x3';
const EARNING_WALLET_TYPE = 'earning_wallet';
const BONUS_WALLET_TYPE = 'bonus_wallet';
const RECYCLE_CONFIRMATION = 'Recycle creates a new entry and repeats the same process in global FIFO order from left to right.';
const SLOT_ORDER = Object.freeze([
  { position: 1, label: 'LEFT' },
  { position: 2, label: 'MIDDLE' },
  { position: 3, label: 'RIGHT' }
]);

const AUTOPOOL_CONFIG = Object.freeze({
  2: Object.freeze({ amount: 2, entryAmount: 2, self: 1.5, upline: 0.5, bonus: 2, recycle: 2 }),
  99: Object.freeze({ amount: 99, entryAmount: 99, self: 74.25, upline: 24.75, bonus: 99, recycle: 99 }),
  313: Object.freeze({ amount: 313, entryAmount: 313, self: 235, upline: 78, bonus: 313, recycle: 313 }),
  786: Object.freeze({ amount: 786, entryAmount: 786, self: 596, upline: 190, bonus: 786, recycle: 786 })
});

const PACKAGE_AMOUNTS = Object.freeze(
  Object.keys(AUTOPOOL_CONFIG)
    .map((value) => Number(value))
    .sort((left, right) => left - right)
);

const AUTOPOOL_TRANSACTION_TYPES = Object.freeze({
  ENTRY: 'ENTRY',
  INCOME: 'EARN',
  SPONSOR: 'UPLINE',
  RECYCLE: 'RECYCLE',
  BONUS: 'BONUS'
});

const AUTOPOOL_WALLET_SOURCES = Object.freeze({
  ENTRY: 'autopool_entry',
  INCOME: 'autopool_matrix_income',
  SPONSOR: 'sponsor_pool_income',
  BONUS: 'autopool_bonus_share'
});

const AUTOPOOL_WALLET_SOURCE_ALIASES = Object.freeze({
  ENTRY: [AUTOPOOL_WALLET_SOURCES.ENTRY],
  INCOME: [AUTOPOOL_WALLET_SOURCES.INCOME],
  SPONSOR: [AUTOPOOL_WALLET_SOURCES.SPONSOR, 'autopool_upline_income'],
  BONUS: [AUTOPOOL_WALLET_SOURCES.BONUS, 'autopool_auction_share']
});

const AUTOPOOL_HISTORY_FILTERS = Object.freeze({
  total: Object.freeze({
    type: 'total',
    title: 'Total Income',
    walletSources: [AUTOPOOL_WALLET_SOURCES.INCOME, AUTOPOOL_WALLET_SOURCES.SPONSOR]
  }),
  pool_2: Object.freeze({
    type: 'pool_2',
    title: '$2 Pool Income',
    packageAmount: 2,
    walletSources: [AUTOPOOL_WALLET_SOURCES.INCOME]
  }),
  pool_99: Object.freeze({
    type: 'pool_99',
    title: '$99 Pool Income',
    packageAmount: 99,
    walletSources: [AUTOPOOL_WALLET_SOURCES.INCOME]
  }),
  pool_313: Object.freeze({
    type: 'pool_313',
    title: '$313 Pool Income',
    packageAmount: 313,
    walletSources: [AUTOPOOL_WALLET_SOURCES.INCOME]
  }),
  pool_786: Object.freeze({
    type: 'pool_786',
    title: '$786 Pool Income',
    packageAmount: 786,
    walletSources: [AUTOPOOL_WALLET_SOURCES.INCOME]
  }),
  sponsor_pool: Object.freeze({
    type: 'sponsor_pool',
    title: 'Sponsor Pool Income',
    walletSources: [AUTOPOOL_WALLET_SOURCES.SPONSOR]
  })
});

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function formatMoney(value) {
  return `$${toMoney(value).toFixed(2)}`;
}

function isPresent(value) {
  return value !== undefined && value !== null && value !== '';
}

function normalizePackageAmount(value, fallback = DEFAULT_PACKAGE_AMOUNT) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? toMoney(parsed) : toMoney(fallback);
}

function resolveHistoryFilter(type = 'total') {
  const normalizedType = String(type || 'total').trim().toLowerCase();
  const filter = AUTOPOOL_HISTORY_FILTERS[normalizedType];
  if (!filter) {
    throw new ApiError(400, `Unsupported autopool history type: ${type}`);
  }
  return filter;
}

function matchesWalletSource(value, sourceAliases = []) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return false;
  return sourceAliases.includes(normalizedValue);
}

function normalizeWalletSource(value) {
  if (matchesWalletSource(value, AUTOPOOL_WALLET_SOURCE_ALIASES.SPONSOR)) {
    return AUTOPOOL_WALLET_SOURCES.SPONSOR;
  }
  if (matchesWalletSource(value, AUTOPOOL_WALLET_SOURCE_ALIASES.INCOME)) {
    return AUTOPOOL_WALLET_SOURCES.INCOME;
  }
  if (matchesWalletSource(value, AUTOPOOL_WALLET_SOURCE_ALIASES.BONUS)) {
    return AUTOPOOL_WALLET_SOURCES.BONUS;
  }
  if (matchesWalletSource(value, AUTOPOOL_WALLET_SOURCE_ALIASES.ENTRY)) {
    return AUTOPOOL_WALLET_SOURCES.ENTRY;
  }
  return value || null;
}

function historyTypeLabel(type, walletSource = null) {
  const normalizedWalletSource = normalizeWalletSource(walletSource);
  if (normalizedWalletSource === AUTOPOOL_WALLET_SOURCES.SPONSOR) return 'Sponsor Pool Income';
  if (normalizedWalletSource === AUTOPOOL_WALLET_SOURCES.INCOME) return 'Autopool Income';
  if (normalizedWalletSource === AUTOPOOL_WALLET_SOURCES.BONUS) return 'Autopool Bonus Share';
  if ([AUTOPOOL_TRANSACTION_TYPES.INCOME, 'AUTOPOOL_INCOME'].includes(type)) return 'Autopool Income';
  if ([AUTOPOOL_TRANSACTION_TYPES.SPONSOR, 'SPONSOR_POOL_INCOME'].includes(type)) return 'Sponsor Pool Income';
  if ([AUTOPOOL_TRANSACTION_TYPES.RECYCLE, 'AUTOPOOL_RECYCLE'].includes(type)) return 'Autopool Recycle';
  if ([AUTOPOOL_TRANSACTION_TYPES.ENTRY, 'AUTOPOOL_ENTRY'].includes(type)) return 'Autopool Entry';
  if ([AUTOPOOL_TRANSACTION_TYPES.BONUS, 'AUTOPOOL_BONUS_SHARE'].includes(type)) return 'Autopool Bonus Share';
  return 'Autopool Transaction';
}

function getPackageConfig(packageAmount = DEFAULT_PACKAGE_AMOUNT) {
  const normalizedAmount = normalizePackageAmount(packageAmount);
  const config = AUTOPOOL_CONFIG[normalizedAmount];
  if (!config) {
    throw new ApiError(400, `Unsupported autopool package amount: ${normalizedAmount}`);
  }
  return config;
}

function buildPackageConfig(packageAmount) {
  const config = getPackageConfig(packageAmount);
  return {
    amount: config.amount,
    entryAmount: config.entryAmount,
    matrixType: MATRIX_TYPE,
    slotsPerEntry: MATRIX_SLOTS,
    distribution: {
      upline: config.upline,
      self: config.self,
      bonus: config.bonus,
      recycle: config.recycle
    },
    walletTypes: {
      earning: EARNING_WALLET_TYPE,
      bonus: BONUS_WALLET_TYPE
    }
  };
}

function buildOverviewConfig() {
  return {
    matrixType: MATRIX_TYPE,
    slotsPerEntry: MATRIX_SLOTS,
    queueRule: 'OLDEST_ACTIVE_MATRIX_FIFO',
    fillDirection: 'TOP_TO_BOTTOM_LEFT_TO_RIGHT',
    recycleCreatesNewEntry: true,
    recycleWalletCreditApplied: false,
    recycleConfirmation: RECYCLE_CONFIRMATION,
    bonusWalletLabel: 'Bonus Wallet',
    packages: PACKAGE_AMOUNTS.map(buildPackageConfig),
    slotOrder: SLOT_ORDER
  };
}

function getSlotLabel(slotPosition) {
  return SLOT_ORDER.find((item) => item.position === Number(slotPosition))?.label || null;
}

function buildFillProgress(filledSlotsCount = 0) {
  const filled = Math.max(0, Math.min(MATRIX_SLOTS, Number(filledSlotsCount || 0)));
  return {
    filled,
    total: MATRIX_SLOTS,
    label: `${filled}/${MATRIX_SLOTS}`
  };
}

function buildUser(row, prefix = '') {
  const firstName = String(row?.[`${prefix}first_name`] || '').trim();
  const lastName = String(row?.[`${prefix}last_name`] || '').trim();
  const username = row?.[`${prefix}username`] || null;
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || username || 'Member';

  return {
    id: row?.[`${prefix}user_id`] || row?.user_id || row?.id || null,
    username,
    firstName: firstName || null,
    lastName: lastName || null,
    displayName
  };
}

function buildEntrySummary(entry, children = []) {
  if (!entry) return null;

  const fillProgress = buildFillProgress(entry.filled_slots_count);
  const childrenBySlot = new Map(
    children.map((child) => {
      const childFillProgress = buildFillProgress(child.filled_slots_count);
      return [
        Number(child.slot_position),
        {
          slotPosition: Number(child.slot_position),
          slotLabel: getSlotLabel(child.slot_position),
          entryId: child.entry_id || child.id,
          packageAmount: normalizePackageAmount(child.package_amount),
          status: child.status,
          filledSlotsCount: Number(child.filled_slots_count || 0),
          fillProgress: childFillProgress,
          fillLabel: childFillProgress.label,
          recycleCount: Number(child.recycle_count || 0),
          cycleNumber: Number(child.cycle_number || 0),
          createdAt: child.created_at,
          user: buildUser(child)
        }
      ];
    })
  );

  return {
    id: entry.id,
    packageAmount: normalizePackageAmount(entry.package_amount),
    status: entry.status,
    entrySource: entry.entry_source,
    matrixType: MATRIX_TYPE,
    cycleNumber: Number(entry.cycle_number || 0),
    recycleCount: Number(entry.recycle_count || 0),
    filledSlotsCount: Number(entry.filled_slots_count || 0),
    fillProgress,
    fillLabel: fillProgress.label,
    slotPosition: entry.slot_position === null || entry.slot_position === undefined ? null : Number(entry.slot_position),
    slotLabel: getSlotLabel(entry.slot_position),
    queuePosition: entry.queue_position === null || entry.queue_position === undefined ? null : Number(entry.queue_position),
    createdAt: entry.created_at,
    completedAt: entry.completed_at || null,
    user: buildUser(entry),
    parent: entry.parent_entry_id
      ? {
          entryId: entry.parent_entry_id,
          cycleNumber: Number(entry.parent_cycle_number || 0),
          user: buildUser(entry, 'parent_')
        }
      : null,
    children: [1, 2, 3].map((slotPosition) => (
      childrenBySlot.get(slotPosition) || {
        slotPosition,
        slotLabel: getSlotLabel(slotPosition),
        entryId: null,
        packageAmount: normalizePackageAmount(entry.package_amount),
        status: 'empty',
        filledSlotsCount: 0,
        fillProgress: buildFillProgress(0),
        fillLabel: '0/3',
        recycleCount: 0,
        cycleNumber: null,
        createdAt: null,
        user: null,
        isEmpty: true
      }
    ))
  };
}

function buildActiveEntrySummary(entry) {
  if (!entry) return null;

  const fillProgress = buildFillProgress(entry.filled_slots_count);
  return {
    id: entry.id,
    packageAmount: normalizePackageAmount(entry.package_amount),
    status: entry.status,
    entrySource: entry.entry_source,
    matrixType: MATRIX_TYPE,
    cycleNumber: Number(entry.cycle_number || 0),
    recycleCount: Number(entry.recycle_count || 0),
    filledSlotsCount: Number(entry.filled_slots_count || 0),
    fillProgress,
    fillLabel: fillProgress.label,
    slotPosition: entry.slot_position === null || entry.slot_position === undefined ? null : Number(entry.slot_position),
    slotLabel: getSlotLabel(entry.slot_position),
    queuePosition: entry.queue_position === null || entry.queue_position === undefined ? null : Number(entry.queue_position),
    createdAt: entry.created_at,
    parent: entry.parent_entry_id
      ? {
          entryId: entry.parent_entry_id,
          cycleNumber: Number(entry.parent_cycle_number || 0),
          user: buildUser(entry, 'parent_')
        }
      : null
  };
}

function buildPackageSummary(packageAmount, stats = {}, currentEntry = null) {
  const fillProgress = currentEntry?.fillProgress || buildFillProgress(0);
  const sponsorPoolIncome = toMoney(stats.sponsorPoolIncome || stats.uplineEarnings || 0);

  return {
    amount: normalizePackageAmount(packageAmount),
    entryAmount: normalizePackageAmount(packageAmount),
    matrixType: MATRIX_TYPE,
    earnings: toMoney(stats.totalEarnings || 0),
    myEntry: Number(stats.myEntry || 0),
    recycleCount: Number(stats.totalRecycles || stats.recycle || stats.completedCycles || 0),
    totalEntries: Number(stats.totalEntries || 0),
    activeEntries: Number(stats.activeEntries || 0),
    completedCycles: Number(stats.completedCycles || stats.totalRecycles || 0),
    totalBonus: toMoney(stats.totalBonusShare || 0),
    ownerEarnings: toMoney(stats.ownerEarnings || 0),
    sponsorPoolIncome,
    uplineEarnings: sponsorPoolIncome,
    currentEntry,
    currentMatrix: currentEntry?.matrixType || MATRIX_TYPE,
    currentCycleNumber: Number(currentEntry?.cycleNumber || 0),
    currentRecycleCount: Number(currentEntry?.recycleCount || 0),
    currentFillCount: Number(currentEntry?.filledSlotsCount || 0),
    currentFillLabel: currentEntry?.fillLabel || fillProgress.label,
    currentFillProgress: fillProgress
  };
}

function buildIncomeSummary(summary = {}) {
  return {
    totalIncome: toMoney(summary.totalIncome || 0),
    pool2Income: toMoney(summary.pool2Income || 0),
    pool99Income: toMoney(summary.pool99Income || 0),
    pool313Income: toMoney(summary.pool313Income || 0),
    pool786Income: toMoney(summary.pool786Income || 0),
    sponsorPoolIncome: toMoney(summary.sponsorPoolIncome || 0)
  };
}

function buildDefaultStats() {
  return {
    myEntry: 0,
    recycle: 0,
    purchaseEntries: 0,
    totalRecycles: 0,
    completedCycles: 0,
    totalEarnings: 0,
    totalIncome: 0,
    sponsorPoolIncome: 0,
    currentMatrix: MATRIX_TYPE,
    currentCycleNumber: 0,
    currentRecycleCount: 0,
    currentFillCount: 0,
    currentFillLabel: buildFillProgress(0).label,
    currentFillProgress: buildFillProgress(0)
  };
}

function buildHistoryItem(item) {
  if (!item) return null;

  const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  const walletSource = normalizeWalletSource(item.wallet_source || metadata.walletSource || null);
  const packageAmount = isPresent(item.package_amount) || isPresent(metadata.packageAmount)
    ? normalizePackageAmount(item.package_amount ?? metadata.packageAmount, 0)
    : null;
  const cycleNumber = item.cycle_number === null || item.cycle_number === undefined
    ? (isPresent(metadata.cycleNumber)
      ? Number(metadata.cycleNumber)
      : isPresent(metadata.sourceCycleNumber)
        ? Number(metadata.sourceCycleNumber)
        : isPresent(metadata.recycleCycleNumber)
          ? Number(metadata.recycleCycleNumber)
          : null)
    : Number(item.cycle_number);
  const recycleCount = item.recycle_count === null || item.recycle_count === undefined
    ? (isPresent(metadata.recycleCount) ? Number(metadata.recycleCount) : null)
    : Number(item.recycle_count);
  const entryId = item.entry_id
    || metadata.entryId
    || metadata.completedEntryId
    || metadata.sourceEntryId
    || metadata.recycleEntryId
    || null;

  return {
    id: item.id,
    amount: toMoney(item.amount || 0),
    type: item.type,
    incomeType: item.type,
    walletSource,
    incomeTypeLabel: historyTypeLabel(item.type, walletSource),
    poolType: packageAmount,
    packageAmount,
    createdAt: item.created_at,
    sourceUser: item.source_user_id ? buildUser(item, 'source_') : null,
    entryId,
    matrixId: entryId,
    purchaseDate: item.entry_created_at || null,
    completedAt: item.entry_completed_at || null,
    cycleNumber,
    recycleCount,
    entrySource: item.entry_source || metadata.entrySource || null,
    entryStatus: item.entry_status || null,
    completedEntryId: metadata.completedEntryId || entryId || null,
    recycleEntryId: metadata.recycleEntryId || null,
    sourceEntryId: metadata.sourceEntryId || metadata.triggerEntryId || null,
    walletTransactionId: item.wallet_transaction_id || null,
    metadata
  };
}

function assertValidSlotPosition(slotPosition) {
  const normalized = Number(slotPosition || 0);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > MATRIX_SLOTS) {
    throw new ApiError(500, 'Autopool queue returned an invalid slot position');
  }
  return normalized;
}

function buildAutopoolEventKey(kind, packageAmount, entryId, suffix = '') {
  const normalizedAmount = normalizePackageAmount(packageAmount).toString().replace('.', '_');
  const extra = suffix ? `:${suffix}` : '';
  return `autopool:${kind}:${normalizedAmount}:${entryId}${extra}`;
}

async function getWalletTransaction(client, userId, source, referenceId) {
  return walletRepository.getTransactionBySourceAndReference(client, userId, source, referenceId);
}

async function createAutopoolNotification(client, payload) {
  return notificationService.createNotificationOnce(client, {
    userId: payload.userId,
    type: 'autopool',
    title: payload.title,
    message: payload.message,
    route: '/autopool',
    metadata: {
      sourceKey: payload.sourceKey,
      ...(payload.metadata || {})
    }
  });
}

async function createAutopoolTransactionOnce(client, payload) {
  if (payload.eventKey) {
    const existing = await autopoolRepository.getTransactionByEventKey(client, payload.eventKey);
    if (existing) {
      return existing;
    }
  }

  return autopoolRepository.createTransaction(client, payload);
}

async function creditAutopoolWalletOnce(client, payload) {
  if (toMoney(payload.amount) <= 0) {
    return null;
  }

  const existingAutopoolTransaction = payload.eventKey
    ? await autopoolRepository.getTransactionByEventKey(client, payload.eventKey)
    : null;

  let walletTransaction = await getWalletTransaction(client, payload.userId, payload.walletSource, payload.entryId);
  if (!walletTransaction) {
    const credited = await walletService.creditWithTransaction(
      client,
      payload.userId,
      payload.amount,
      payload.walletSource,
      payload.entryId,
      {
        walletType: payload.walletType,
        walletLedgerType: payload.walletType,
        source: 'autopool',
        packageAmount: normalizePackageAmount(payload.packageAmount),
        entryId: payload.entryId,
        cycleNumber: Number(payload.cycleNumber || 0),
        ...(payload.walletMetadata || {})
      }
    );
    walletTransaction = credited.transaction;
  }

  const autopoolTransaction = existingAutopoolTransaction || await createAutopoolTransactionOnce(client, {
    userId: payload.userId,
    entryId: payload.entryId,
    type: payload.transactionType,
    amount: payload.amount,
    packageAmount: payload.packageAmount,
    sourceUserId: payload.sourceUserId || null,
    walletTransactionId: walletTransaction?.id || null,
    eventKey: payload.eventKey || null,
      metadata: {
        source: 'autopool',
        walletType: payload.walletType,
        walletSource: payload.walletSource,
        packageAmount: normalizePackageAmount(payload.packageAmount),
        entryId: payload.entryId,
        cycleNumber: Number(payload.cycleNumber || 0),
      ...(payload.autopoolMetadata || {})
    }
  });

  if (payload.notificationTitle && payload.notificationMessage) {
    await createAutopoolNotification(client, {
      userId: payload.userId,
      title: payload.notificationTitle,
      message: payload.notificationMessage,
      sourceKey: payload.eventKey || buildAutopoolEventKey('notify', payload.packageAmount, payload.entryId, payload.notificationTitle),
      metadata: {
        packageAmount: normalizePackageAmount(payload.packageAmount),
        entryId: payload.entryId,
        cycleNumber: Number(payload.cycleNumber || 0),
        amount: toMoney(payload.amount),
        walletType: payload.walletType
      }
    });
  }

  return {
    walletTransaction,
    autopoolTransaction
  };
}

async function createNextEntryForUser(client, userId, options = {}) {
  const packageConfig = getPackageConfig(options.packageAmount);
  const latestEntry = await autopoolRepository.getLatestUserEntry(client, userId, {
    packageAmount: packageConfig.amount,
    forUpdate: true
  });
  const cycleNumber = Number(latestEntry?.cycle_number || 0) + 1 || 1;
  const recycleCount = options.recycleCount === undefined
    ? (options.entrySource === 'recycle' ? Number(latestEntry?.recycle_count || 0) : 0)
    : Number(options.recycleCount || 0);

  return autopoolRepository.createEntryOnce(client, {
    userId,
    packageAmount: packageConfig.amount,
    cycleNumber,
    recycleCount,
    entrySource: options.entrySource || 'purchase'
  });
}

async function placeEntryInQueue(client, entry, context) {
  const packageAmount = normalizePackageAmount(entry.package_amount || context.packageAmount || DEFAULT_PACKAGE_AMOUNT);
  const parentEntry = await autopoolRepository.getNextQueueParentForUpdate(client, {
    packageAmount,
    excludeEntryId: entry.id
  });

  if (!parentEntry) {
    await autopoolRepository.enqueueEntry(client, entry.id, entry.created_at);
    context.events.push({
      type: 'ROOT_ENTRY',
      packageAmount,
      entryId: entry.id,
      userId: entry.user_id
    });
    return {
      packageAmount,
      entryId: entry.id,
      parentEntryId: null,
      parentUserId: null,
      slotPosition: null,
      slotLabel: null,
      isRoot: true
    };
  }

  const slotPosition = assertValidSlotPosition(Number(parentEntry.filled_slots_count || 0) + 1);
  await autopoolRepository.updateEntryPlacement(client, entry.id, parentEntry.id, slotPosition);
  await autopoolRepository.createChildLink(client, {
    parentEntryId: parentEntry.id,
    childEntryId: entry.id,
    slotPosition
  });
  const updatedParent = await autopoolRepository.incrementFilledSlots(client, parentEntry.id);
  await autopoolRepository.enqueueEntry(client, entry.id, entry.created_at);

  context.events.push({
    type: 'PLACED',
    packageAmount,
    entryId: entry.id,
    userId: entry.user_id,
    parentEntryId: parentEntry.id,
    parentUserId: parentEntry.user_id,
    slotPosition,
    slotLabel: getSlotLabel(slotPosition),
    parentFillCount: Number(updatedParent?.filled_slots_count || 0)
  });

  await createAutopoolNotification(client, {
    userId: parentEntry.user_id,
    title: 'Autopool slot filled',
    message: `${getSlotLabel(slotPosition) || `Slot ${slotPosition}`} was filled in your ${formatMoney(packageAmount)} package matrix.`,
    sourceKey: buildAutopoolEventKey('slot', packageAmount, parentEntry.id, slotPosition),
    metadata: {
      packageAmount,
      entryId: parentEntry.id,
      childEntryId: entry.id,
      slotPosition,
      slotLabel: getSlotLabel(slotPosition),
      filledSlotsCount: Number(updatedParent?.filled_slots_count || 0)
    }
  });

  if (Number(updatedParent?.filled_slots_count || 0) >= MATRIX_SLOTS) {
    await completeEntryAndRecycle(client, updatedParent, entry, context);
  }

  return {
    packageAmount,
    entryId: entry.id,
    parentEntryId: parentEntry.id,
    parentUserId: parentEntry.user_id,
    slotPosition,
    slotLabel: getSlotLabel(slotPosition),
    isRoot: false
  };
}

async function completeEntryAndRecycle(client, completedEntry, triggerEntry, context) {
  await autopoolRepository.acquireEntryCompletionLock(client, completedEntry.id);

  const packageConfig = getPackageConfig(completedEntry.package_amount);
  const packageAmount = packageConfig.amount;
  const cycleNumber = Number(completedEntry.cycle_number || 0);
  const nextRecycleCount = Number(completedEntry.recycle_count || 0) + 1;
  const completionEventKey = buildAutopoolEventKey('complete', packageAmount, completedEntry.id, cycleNumber);
  const existingCompletion = await autopoolRepository.getTransactionByEventKey(client, `${completionEventKey}:owner`);

  if (existingCompletion) {
    return;
  }

  const markedEntry = await autopoolRepository.markEntryCompleted(client, completedEntry.id, nextRecycleCount);
  await autopoolRepository.removeQueuedEntry(client, markedEntry.id);
  const matrixOwnerUserId = markedEntry.user_id;
  const sponsorUserId = await userRepository.getSponsorIdByUserId(client, matrixOwnerUserId);

  await creditAutopoolWalletOnce(client, {
    userId: markedEntry.user_id,
    amount: packageConfig.self,
    walletType: EARNING_WALLET_TYPE,
    walletSource: AUTOPOOL_WALLET_SOURCES.INCOME,
    entryId: markedEntry.id,
    packageAmount,
    cycleNumber,
    sourceUserId: triggerEntry.user_id,
    transactionType: AUTOPOOL_TRANSACTION_TYPES.INCOME,
    eventKey: `${completionEventKey}:owner`,
    walletMetadata: {
      note: `Autopool cycle #${cycleNumber} completed`,
      triggerEntryId: triggerEntry.id,
      triggerUserId: triggerEntry.user_id
    },
    autopoolMetadata: {
      triggerEntryId: triggerEntry.id,
      triggerUserId: triggerEntry.user_id
    },
    notificationTitle: 'Autopool income received',
    notificationMessage: `You earned ${formatMoney(packageConfig.self)} in your ${formatMoney(packageAmount)} Global Autopool cycle.`
  });

  if (sponsorUserId && sponsorUserId !== matrixOwnerUserId && toMoney(packageConfig.upline) > 0) {
    await creditAutopoolWalletOnce(client, {
      userId: sponsorUserId,
      amount: packageConfig.upline,
      walletType: EARNING_WALLET_TYPE,
      walletSource: AUTOPOOL_WALLET_SOURCES.SPONSOR,
      entryId: markedEntry.id,
      packageAmount,
      cycleNumber,
      sourceUserId: matrixOwnerUserId,
      transactionType: AUTOPOOL_TRANSACTION_TYPES.SPONSOR,
      eventKey: `${completionEventKey}:sponsor:${sponsorUserId}`,
      walletMetadata: {
        sourceEntryId: markedEntry.id,
        sourceOwnerId: matrixOwnerUserId,
        sourceCycleNumber: cycleNumber,
        matrixOwnerUserId,
        sponsorUserId,
        sponsorRelationship: 'direct_referral',
        note: `Sponsor pool income from ${formatMoney(packageAmount)} package cycle #${cycleNumber}`
      },
      autopoolMetadata: {
        sourceEntryId: markedEntry.id,
        sourceOwnerId: matrixOwnerUserId,
        matrixOwnerUserId,
        sponsorUserId,
        sourceCycleNumber: cycleNumber,
        sponsorRelationship: 'direct_referral'
      },
      notificationTitle: 'Sponsor pool income',
      notificationMessage: `You earned ${formatMoney(packageConfig.upline)} as sponsor pool income from the ${formatMoney(packageAmount)} package.`
    });
  }

  await creditAutopoolWalletOnce(client, {
    userId: markedEntry.user_id,
    amount: packageConfig.bonus,
    walletType: BONUS_WALLET_TYPE,
    walletSource: AUTOPOOL_WALLET_SOURCES.BONUS,
    entryId: markedEntry.id,
    packageAmount,
    cycleNumber,
    sourceUserId: markedEntry.user_id,
    transactionType: AUTOPOOL_TRANSACTION_TYPES.BONUS,
    eventKey: `${completionEventKey}:bonus`,
    walletMetadata: {
      creditedTo: 'bonus_wallet',
      note: `Autopool bonus wallet credit from ${formatMoney(packageAmount)} package cycle #${cycleNumber}`
    },
    autopoolMetadata: {
      creditedTo: 'bonus_wallet'
    },
    notificationTitle: 'Bonus Wallet credited',
    notificationMessage: `${formatMoney(packageConfig.bonus)} was credited to your Bonus Wallet from the ${formatMoney(packageAmount)} package cycle.`
  });

  await createAutopoolNotification(client, {
    userId: markedEntry.user_id,
    title: 'Matrix completed',
    message: `${formatMoney(packageAmount)} autopool cycle #${cycleNumber} completed at ${MATRIX_SLOTS}/${MATRIX_SLOTS}.`,
    sourceKey: `${completionEventKey}:completed`,
    metadata: {
      packageAmount,
      entryId: markedEntry.id,
      cycleNumber,
      recycleCount: nextRecycleCount
    }
  });

  context.events.push({
    type: 'COMPLETED',
    packageAmount,
    entryId: markedEntry.id,
    userId: markedEntry.user_id,
    cycleNumber,
    recycleCount: nextRecycleCount,
    triggerEntryId: triggerEntry.id,
    sponsorUserId: sponsorUserId && sponsorUserId !== matrixOwnerUserId ? sponsorUserId : null
  });

  const recycleEntryResult = await createNextEntryForUser(client, markedEntry.user_id, {
    packageAmount,
    entrySource: 'recycle',
    recycleCount: nextRecycleCount
  });
  const recycleEntry = recycleEntryResult.entry;

  if (!recycleEntry) {
    throw new ApiError(409, 'Autopool recycle entry could not be resolved');
  }

  await createAutopoolTransactionOnce(client, {
    userId: markedEntry.user_id,
    entryId: recycleEntry.id,
    type: AUTOPOOL_TRANSACTION_TYPES.RECYCLE,
    amount: packageConfig.recycle,
    packageAmount,
    sourceUserId: markedEntry.user_id,
    eventKey: `${completionEventKey}:recycle:${recycleEntry.id}`,
    metadata: {
      source: 'autopool',
      packageAmount,
      walletType: null,
      completedEntryId: markedEntry.id,
      completedCycleNumber: cycleNumber,
      recycleCount: nextRecycleCount,
      recycleEntryId: recycleEntry.id,
      recycleCycleNumber: Number(recycleEntry.cycle_number || 0),
      walletCreditApplied: false,
      recycleCreatesNewEntry: true
    }
  });

  let recyclePlacement = null;
  if (recycleEntryResult.inserted) {
    recyclePlacement = await placeEntryInQueue(client, recycleEntry, context);

    context.events.push({
      type: 'RECYCLED',
      packageAmount,
      completedEntryId: markedEntry.id,
      recycleEntryId: recycleEntry.id,
      userId: markedEntry.user_id,
      recycleCount: nextRecycleCount,
      recycleCycleNumber: Number(recycleEntry.cycle_number || 0),
      placement: recyclePlacement
    });
  }

  await createAutopoolNotification(client, {
    userId: markedEntry.user_id,
    title: 'Re-entry activated',
    message: `A new ${formatMoney(packageAmount)} package entry was created automatically and queued for the next cycle. ${RECYCLE_CONFIRMATION}`,
    sourceKey: `${completionEventKey}:recycle-notify:${recycleEntry.id}`,
    metadata: {
      packageAmount,
      completedEntryId: markedEntry.id,
      recycleEntryId: recycleEntry.id,
      recycleCount: nextRecycleCount,
      recycleCreatesNewEntry: true,
      recycleWalletCreditApplied: false,
      recycleConfirmation: RECYCLE_CONFIRMATION,
      placement: recyclePlacement
    }
  });
}

async function getPackagesOverviewWithClient(client, userId) {
  const [packageStatsResult, incomeSummaryQueryResult, focusEntriesResult, activeEntriesResult] = await Promise.allSettled([
    autopoolRepository.listUserPackageStats(client, userId),
    autopoolRepository.getIncomeDashboardSummary(client, userId),
    autopoolRepository.listUserPackageFocusEntries(client, userId),
    autopoolRepository.listUserActiveEntries(client, userId, 12, { packageAmount: DEFAULT_PACKAGE_AMOUNT })
  ]);

  const packageStatsMap = packageStatsResult.status === 'fulfilled' && packageStatsResult.value instanceof Map
    ? packageStatsResult.value
    : new Map();
  const incomeSummaryResult = incomeSummaryQueryResult.status === 'fulfilled' ? incomeSummaryQueryResult.value : {};
  const focusEntries = focusEntriesResult.status === 'fulfilled' && Array.isArray(focusEntriesResult.value)
    ? focusEntriesResult.value
    : [];
  const defaultActiveEntries = activeEntriesResult.status === 'fulfilled' && Array.isArray(activeEntriesResult.value)
    ? activeEntriesResult.value
    : [];

  const focusEntryIds = focusEntries.map((entry) => entry.id);
  let childEntries = [];
  if (focusEntryIds.length > 0) {
    try {
      childEntries = await autopoolRepository.listChildrenForParentEntries(client, focusEntryIds);
    } catch (_error) {
      childEntries = [];
    }
  }

  const focusByPackage = new Map();
  for (const entry of focusEntries) {
    focusByPackage.set(normalizePackageAmount(entry.package_amount), entry);
  }

  const childrenByParentEntry = new Map();
  for (const child of childEntries) {
    const parentEntryId = child.parent_entry_id;
    if (!childrenByParentEntry.has(parentEntryId)) {
      childrenByParentEntry.set(parentEntryId, []);
    }
    childrenByParentEntry.get(parentEntryId).push(child);
  }

  const packages = PACKAGE_AMOUNTS.map((amount) => {
    const focusEntry = focusByPackage.get(amount) || null;
    const currentEntry = focusEntry
      ? buildEntrySummary(focusEntry, childrenByParentEntry.get(focusEntry.id) || [])
      : null;
    return buildPackageSummary(amount, packageStatsMap.get(amount) || {}, currentEntry);
  });

  const defaultPackage = packages.find((item) => item.amount === DEFAULT_PACKAGE_AMOUNT) || packages[0];
  const incomeSummary = buildIncomeSummary(incomeSummaryResult);
  const activeEntries = defaultActiveEntries.map(buildActiveEntrySummary).filter(Boolean);
  const stats = {
    ...buildDefaultStats(),
    myEntry: Number(defaultPackage?.myEntry || 0),
    recycle: Number(defaultPackage?.recycleCount || 0),
    purchaseEntries: Number(defaultPackage?.myEntry || 0),
    totalRecycles: Number(defaultPackage?.recycleCount || 0),
    completedCycles: Number(defaultPackage?.completedCycles || defaultPackage?.recycleCount || 0),
    totalEarnings: toMoney(defaultPackage?.earnings || 0),
    totalIncome: incomeSummary.totalIncome,
    sponsorPoolIncome: incomeSummary.sponsorPoolIncome,
    currentMatrix: defaultPackage?.currentMatrix || MATRIX_TYPE,
    currentCycleNumber: Number(defaultPackage?.currentCycleNumber || 0),
    currentRecycleCount: Number(defaultPackage?.currentRecycleCount || 0),
    currentFillCount: Number(defaultPackage?.currentFillCount || 0),
    currentFillLabel: defaultPackage?.currentFillLabel || buildFillProgress(0).label,
    currentFillProgress: defaultPackage?.currentFillProgress || buildFillProgress(0)
  };

  return {
    config: buildOverviewConfig(),
    packages,
    incomeSummary,
    ...incomeSummary,
    myEntry: stats.myEntry,
    recycle: stats.recycle,
    entries: activeEntries,
    activeMatrices: activeEntries,
    stats,
    currentEntry: defaultPackage?.currentEntry || null,
    activeEntries
  };
}

async function getPackagesOverview(userId) {
  return withTransaction((client) => getPackagesOverviewWithClient(client, userId));
}

async function getDashboard(userId) {
  return getPackagesOverview(userId);
}

async function getHistory(userId, query = {}) {
  return withTransaction(async (client) => {
    const filter = resolveHistoryFilter(query.type || 'total');

    const pagination = normalizePagination({
      page: query.page || 1,
      limit: query.limit || 10,
      maxLimit: 100
    });
    const result = await autopoolRepository.listUserTransactions(client, userId, pagination, {
      packageAmount: filter.packageAmount,
      walletSources: filter.walletSources
    });

    return {
      type: filter.type,
      title: filter.title,
      items: result.items.map(buildHistoryItem).filter(Boolean),
      pagination: buildPagination({
        page: pagination.page,
        limit: pagination.limit,
        total: result.total
      })
    };
  });
}

async function buyAutopoolPackage(userId, payload = {}) {
  return withTransaction(async (client) => {
    await autopoolRepository.acquireGlobalQueueLock(client);
    await autopoolRepository.acquireUserEntryLock(client, userId);

    const packageConfig = getPackageConfig(payload.packageAmount || DEFAULT_PACKAGE_AMOUNT);
    const requestId = payload.requestId || null;

    if (requestId) {
      const existingTransaction = await autopoolRepository.getEntryTransactionByRequestId(client, userId, requestId);
      if (existingTransaction) {
        return {
          ...(await getPackagesOverviewWithClient(client, userId)),
          requestId,
          duplicateRequest: true,
          packageAmount: packageConfig.amount,
          placement: null,
          events: []
        };
      }
    }

    const queueHealth = await autopoolProcessor.ensureQueueHealth(client);
    const entryResult = await createNextEntryForUser(client, userId, {
      packageAmount: packageConfig.amount,
      entrySource: 'purchase'
    });
    const entry = entryResult.entry;

    if (!entry) {
      throw new ApiError(409, 'Autopool entry could not be resolved');
    }

    if (!entryResult.inserted) {
      return {
        ...(await getPackagesOverviewWithClient(client, userId)),
        requestId,
        duplicateRequest: true,
        queueHealth,
        packageAmount: packageConfig.amount,
        placement: null,
        events: []
      };
    }

    await walletService.debit(
      client,
      userId,
      packageConfig.entryAmount,
      AUTOPOOL_WALLET_SOURCES.ENTRY,
      entry.id,
      {
        requestId,
        packageAmount: packageConfig.amount,
        note: `Global autopool ${formatMoney(packageConfig.amount)} entry purchase`
      }
    );

    const walletTransaction = await getWalletTransaction(client, userId, AUTOPOOL_WALLET_SOURCES.ENTRY, entry.id);
    await createAutopoolTransactionOnce(client, {
      userId,
      entryId: entry.id,
      type: AUTOPOOL_TRANSACTION_TYPES.ENTRY,
      amount: packageConfig.entryAmount,
      packageAmount: packageConfig.amount,
      sourceUserId: userId,
      walletTransactionId: walletTransaction?.id || null,
      requestId,
      eventKey: buildAutopoolEventKey('entry', packageConfig.amount, entry.id),
      metadata: {
        source: 'autopool',
        packageAmount: packageConfig.amount,
        entryId: entry.id,
        cycleNumber: Number(entry.cycle_number || 0),
        recycleCount: Number(entry.recycle_count || 0),
        entrySource: 'purchase',
        walletType: 'spendable'
      }
    });

    const context = {
      requestId,
      packageAmount: packageConfig.amount,
      events: []
    };

    const placement = await placeEntryInQueue(client, entry, context);
    const overview = await getPackagesOverviewWithClient(client, userId);

    return {
      ...overview,
      requestId,
      duplicateRequest: false,
      queueHealth,
      packageAmount: packageConfig.amount,
      placement,
      events: context.events
    };
  });
}

async function enterAutopool(userId, payload = {}) {
  return buyAutopoolPackage(userId, {
    ...payload,
    packageAmount: DEFAULT_PACKAGE_AMOUNT
  });
}

module.exports = {
  AUTOPOOL_CONFIG,
  DEFAULT_PACKAGE_AMOUNT,
  PACKAGE_AMOUNTS,
  MATRIX_SLOTS,
  MATRIX_TYPE,
  EARNING_WALLET_TYPE,
  BONUS_WALLET_TYPE,
  RECYCLE_CONFIRMATION,
  getPackagesOverview,
  getDashboard,
  getHistory,
  buyAutopoolPackage,
  enterAutopool
};
