const { withTransaction } = require('../db/pool');
const autopoolRepository = require('../repositories/autopoolRepository');
const walletRepository = require('../repositories/walletRepository');
const walletService = require('./walletService');
const notificationService = require('./notificationService');
const autopoolProcessor = require('../jobs/autopoolProcessor');
const { normalizePagination, buildPagination } = require('../utils/pagination');
const { ApiError } = require('../utils/ApiError');

const ENTRY_AMOUNT = 2;
const MATRIX_SLOTS = 3;
const MATRIX_TYPE = '1x3';
const OWNER_PAYOUT = 1.5;
const UPLINE_PAYOUT = 0.5;
const AUCTION_SHARE = 2;
const RECYCLE_AMOUNT = 2;
const AUCTIONS_WALLET_TYPE = 'auction_bonus';
const RECYCLE_CONFIRMATION = 'Recycle creates a new entry and repeats the same process in global FIFO order from left to right.';
const SLOT_ORDER = Object.freeze([
  { position: 1, label: 'LEFT' },
  { position: 2, label: 'MIDDLE' },
  { position: 3, label: 'RIGHT' }
]);

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function formatMoney(value) {
  return `$${toMoney(value).toFixed(2)}`;
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
    id: row?.[`${prefix}user_id`] || row?.id || null,
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

function buildConfig() {
  return {
    entryAmount: ENTRY_AMOUNT,
    matrixType: MATRIX_TYPE,
    slotsPerEntry: MATRIX_SLOTS,
    ownerPayout: OWNER_PAYOUT,
    uplinePayout: UPLINE_PAYOUT,
    auctionShare: AUCTION_SHARE,
    auctionWalletType: AUCTIONS_WALLET_TYPE,
    auctionWalletLabel: 'Auctions Wallet',
    recycleAmount: RECYCLE_AMOUNT,
    recycleCreatesNewEntry: true,
    recycleWalletCreditApplied: false,
    recycleConfirmation: RECYCLE_CONFIRMATION,
    queueRule: 'OLDEST_ACTIVE_MATRIX_FIFO',
    fillDirection: 'TOP_TO_BOTTOM_LEFT_TO_RIGHT',
    slotOrder: SLOT_ORDER
  };
}

function assertValidSlotPosition(slotPosition) {
  const normalized = Number(slotPosition || 0);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > MATRIX_SLOTS) {
    throw new ApiError(500, 'Autopool queue returned an invalid slot position');
  }
  return normalized;
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

async function createNextEntryForUser(client, userId, options = {}) {
  const latestEntry = await autopoolRepository.getLatestUserEntry(client, userId);
  const cycleNumber = Number(latestEntry?.cycle_number || 0) + 1 || 1;
  const recycleCount = options.recycleCount === undefined
    ? Number(latestEntry?.recycle_count || 0)
    : Number(options.recycleCount || 0);

  return autopoolRepository.createEntry(client, {
    userId,
    cycleNumber,
    recycleCount,
    entrySource: options.entrySource || 'purchase'
  });
}

async function getDashboardWithClient(client, userId) {
  const [stats, focusEntry, activeEntries] = await Promise.all([
    autopoolRepository.getUserStats(client, userId),
    autopoolRepository.getCurrentUserFocusEntry(client, userId),
    autopoolRepository.listUserActiveEntries(client, userId, 12)
  ]);

  const children = focusEntry ? await autopoolRepository.listEntryChildren(client, focusEntry.id) : [];
  const currentEntry = buildEntrySummary(focusEntry, children);

  return {
    config: buildConfig(),
    stats: {
      ...stats,
      currentMatrix: currentEntry?.matrixType || MATRIX_TYPE,
      currentCycleNumber: Number(currentEntry?.cycleNumber || 0),
      currentRecycleCount: Number(currentEntry?.recycleCount || 0),
      currentFillCount: Number(currentEntry?.filledSlotsCount || 0),
      currentFillLabel: currentEntry?.fillLabel || `0/${MATRIX_SLOTS}`,
      currentFillProgress: currentEntry?.fillProgress || buildFillProgress(0)
    },
    currentEntry,
    activeEntries: activeEntries.map(buildActiveEntrySummary)
  };
}

function buildHistorySummary(items = []) {
  return items.reduce((summary, item) => {
    const amount = toMoney(item.amount || 0);
    if (item.type === 'EARN') summary.ownerEarnings = toMoney(summary.ownerEarnings + amount);
    if (item.type === 'UPLINE') summary.uplineEarnings = toMoney(summary.uplineEarnings + amount);
    if (item.type === 'RECYCLE') summary.recycleAmount = toMoney(summary.recycleAmount + amount);
    if (item.type === 'AUCTION') summary.auctionAmount = toMoney(summary.auctionAmount + amount);
    if (item.type === 'ENTRY') summary.entryAmount = toMoney(summary.entryAmount + amount);
    return summary;
  }, {
    ownerEarnings: 0,
    uplineEarnings: 0,
    recycleAmount: 0,
    auctionAmount: 0,
    entryAmount: 0
  });
}

async function placeEntryInQueue(client, entry, context) {
  const parentEntry = await autopoolRepository.getNextQueueParentForUpdate(client, {
    excludeEntryId: entry.id
  });

  if (!parentEntry) {
    await autopoolRepository.enqueueEntry(client, entry.id, entry.created_at);
    context.events.push({
      type: 'ROOT_ENTRY',
      entryId: entry.id,
      userId: entry.user_id
    });
    return {
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
    title: 'New autopool slot filled',
    message: `${getSlotLabel(slotPosition) || `Slot ${slotPosition}`} was filled in cycle #${Number(parentEntry.cycle_number || 0)}.`,
    sourceKey: `autopool:slot:${parentEntry.id}:${slotPosition}`,
    metadata: {
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
    entryId: entry.id,
    parentEntryId: parentEntry.id,
    parentUserId: parentEntry.user_id,
    slotPosition,
    slotLabel: getSlotLabel(slotPosition),
    isRoot: false
  };
}

async function completeEntryAndRecycle(client, completedEntry, triggerEntry, context) {
  const nextRecycleCount = Number(completedEntry.recycle_count || 0) + 1;
  const markedEntry = await autopoolRepository.markEntryCompleted(client, completedEntry.id, nextRecycleCount);
  await autopoolRepository.removeQueuedEntry(client, completedEntry.id);

  const uplineEntry = markedEntry.parent_entry_id
    ? await autopoolRepository.getEntryById(client, markedEntry.parent_entry_id)
    : null;

  await walletService.credit(
    client,
    markedEntry.user_id,
    OWNER_PAYOUT,
    'autopool_matrix_income',
    markedEntry.id,
    {
      cycleNumber: Number(markedEntry.cycle_number || 0),
      note: `Autopool cycle #${Number(markedEntry.cycle_number || 0)} completed`
    }
  );

  const ownerWalletTransaction = await getWalletTransaction(client, markedEntry.user_id, 'autopool_matrix_income', markedEntry.id);
  await autopoolRepository.createTransaction(client, {
    userId: markedEntry.user_id,
    entryId: markedEntry.id,
    type: 'EARN',
    amount: OWNER_PAYOUT,
    sourceUserId: triggerEntry.user_id,
    walletTransactionId: ownerWalletTransaction?.id || null,
    metadata: {
      triggerEntryId: triggerEntry.id,
      triggerUserId: triggerEntry.user_id,
      cycleNumber: Number(markedEntry.cycle_number || 0)
    }
  });

  if (uplineEntry?.user_id) {
    await walletService.credit(
      client,
      uplineEntry.user_id,
      UPLINE_PAYOUT,
      'autopool_upline_income',
      markedEntry.id,
      {
        sourceEntryId: markedEntry.id,
        sourceUserId: markedEntry.user_id,
        note: `Autopool matrix parent income from cycle #${Number(markedEntry.cycle_number || 0)}`
      }
    );

    const uplineWalletTransaction = await getWalletTransaction(client, uplineEntry.user_id, 'autopool_upline_income', markedEntry.id);
    await autopoolRepository.createTransaction(client, {
      userId: uplineEntry.user_id,
      entryId: markedEntry.id,
      type: 'UPLINE',
      amount: UPLINE_PAYOUT,
      sourceUserId: markedEntry.user_id,
      walletTransactionId: uplineWalletTransaction?.id || null,
      metadata: {
        sourceEntryId: markedEntry.id,
        sourceCycleNumber: Number(markedEntry.cycle_number || 0),
        sourceOwnerId: markedEntry.user_id
      }
    });

    await createAutopoolNotification(client, {
      userId: uplineEntry.user_id,
      title: 'Autopool matrix parent income',
      message: `You earned ${formatMoney(UPLINE_PAYOUT)} as matrix parent income from the FIFO autopool.`,
      sourceKey: `autopool:upline-income:${markedEntry.id}:${uplineEntry.user_id}`,
      metadata: {
        entryId: markedEntry.id,
        amount: UPLINE_PAYOUT,
        sourceUserId: markedEntry.user_id
      }
    });
  }

  await walletService.credit(
    client,
    markedEntry.user_id,
    AUCTION_SHARE,
    'autopool_auction_share',
    markedEntry.id,
    {
      walletType: AUCTIONS_WALLET_TYPE,
      creditedTo: 'auctions_wallet',
      note: `Autopool auctions wallet share from cycle #${Number(markedEntry.cycle_number || 0)}`
    }
  );

  const auctionWalletTransaction = await getWalletTransaction(client, markedEntry.user_id, 'autopool_auction_share', markedEntry.id);
  await autopoolRepository.createTransaction(client, {
    userId: markedEntry.user_id,
    entryId: markedEntry.id,
    type: 'AUCTION',
    amount: AUCTION_SHARE,
    sourceUserId: markedEntry.user_id,
    walletTransactionId: auctionWalletTransaction?.id || null,
    metadata: {
      cycleNumber: Number(markedEntry.cycle_number || 0),
      creditedTo: 'auctions_wallet',
      walletType: AUCTIONS_WALLET_TYPE
    }
  });

  await createAutopoolNotification(client, {
    userId: markedEntry.user_id,
    title: 'Auctions wallet credited',
    message: `${formatMoney(AUCTION_SHARE)} moved to your auctions wallet from cycle #${Number(markedEntry.cycle_number || 0)}.`,
    sourceKey: `autopool:auction-share:${markedEntry.id}`,
    metadata: {
      entryId: markedEntry.id,
      amount: AUCTION_SHARE,
      creditedTo: 'auctions_wallet',
      walletType: AUCTIONS_WALLET_TYPE
    }
  });

  await createAutopoolNotification(client, {
    userId: markedEntry.user_id,
    title: 'Matrix completed',
    message: `Cycle #${Number(markedEntry.cycle_number || 0)} completed at ${MATRIX_SLOTS}/${MATRIX_SLOTS}.`,
    sourceKey: `autopool:complete:${markedEntry.id}`,
    metadata: {
      entryId: markedEntry.id,
      cycleNumber: Number(markedEntry.cycle_number || 0)
    }
  });

  await createAutopoolNotification(client, {
    userId: markedEntry.user_id,
    title: 'Autopool income received',
    message: `You earned ${formatMoney(OWNER_PAYOUT)} from your completed autopool matrix.`,
    sourceKey: `autopool:owner-income:${markedEntry.id}`,
    metadata: {
      entryId: markedEntry.id,
      amount: OWNER_PAYOUT
    }
  });

  if (uplineEntry?.user_id) {
    await createAutopoolNotification(client, {
      userId: markedEntry.user_id,
      title: 'Matrix parent income released',
      message: `Your matrix parent received ${formatMoney(UPLINE_PAYOUT)} from this FIFO completion.`,
      sourceKey: `autopool:upline-release:${markedEntry.id}`,
      metadata: {
        entryId: markedEntry.id,
        uplineUserId: uplineEntry.user_id,
        amount: UPLINE_PAYOUT
      }
    });
  }

  context.events.push({
    type: 'COMPLETED',
    entryId: markedEntry.id,
    userId: markedEntry.user_id,
    cycleNumber: Number(markedEntry.cycle_number || 0),
    recycleCount: nextRecycleCount,
    triggerEntryId: triggerEntry.id,
    uplineUserId: uplineEntry?.user_id || null
  });

  const recycleEntry = await createNextEntryForUser(client, markedEntry.user_id, {
    entrySource: 'recycle',
    recycleCount: nextRecycleCount
  });

  await autopoolRepository.createTransaction(client, {
    userId: markedEntry.user_id,
    entryId: recycleEntry.id,
    type: 'RECYCLE',
    amount: RECYCLE_AMOUNT,
    sourceUserId: markedEntry.user_id,
    metadata: {
      completedEntryId: markedEntry.id,
      completedCycleNumber: Number(markedEntry.cycle_number || 0),
      recycleCount: nextRecycleCount,
      recycleEntryId: recycleEntry.id,
      recycleCycleNumber: Number(recycleEntry.cycle_number || 0),
      walletCreditApplied: false,
      recycleCreatesNewEntry: true
    }
  });

  const recyclePlacement = await placeEntryInQueue(client, recycleEntry, context);

  context.events.push({
    type: 'RECYCLED',
    completedEntryId: markedEntry.id,
    recycleEntryId: recycleEntry.id,
    userId: markedEntry.user_id,
    recycleCount: nextRecycleCount,
    recycleCycleNumber: Number(recycleEntry.cycle_number || 0),
    placement: recyclePlacement
  });

  await createAutopoolNotification(client, {
    userId: markedEntry.user_id,
    title: 'Re-entry activated',
    message: `Cycle #${Number(recycleEntry.cycle_number || 0)} was created as a new entry. ${formatMoney(RECYCLE_AMOUNT)} was used only for automatic re-entry in the global FIFO queue.`,
    sourceKey: `autopool:recycle:${markedEntry.id}:${recycleEntry.id}`,
    metadata: {
      completedEntryId: markedEntry.id,
      recycleEntryId: recycleEntry.id,
      recycleCount: nextRecycleCount,
      recycleCreatesNewEntry: true,
      walletCreditApplied: false,
      recycleConfirmation: RECYCLE_CONFIRMATION,
      placement: recyclePlacement
    }
  });
}

async function getDashboard(userId) {
  return withTransaction((client) => getDashboardWithClient(client, userId));
}

async function getHistory(userId, query = {}) {
  return withTransaction(async (client) => {
    const pagination = normalizePagination({
      page: query.page || 1,
      limit: query.limit || 20,
      maxLimit: 100
    });
    const result = await autopoolRepository.listUserTransactions(client, userId, pagination);
    return {
      data: result.items,
      summary: buildHistorySummary(result.items),
      pagination: buildPagination({
        page: pagination.page,
        limit: pagination.limit,
        total: result.total
      })
    };
  });
}

async function enterAutopool(userId, payload = {}) {
  return withTransaction(async (client) => {
    await autopoolRepository.acquireGlobalQueueLock(client);

    const requestId = payload.requestId || null;
    if (requestId) {
      const existingTransaction = await autopoolRepository.getEntryTransactionByRequestId(client, userId, requestId);
      if (existingTransaction) {
        return {
          ...(await getDashboardWithClient(client, userId)),
          requestId,
          duplicateRequest: true,
          placement: null,
          events: []
        };
      }
    }

    const queueHealth = await autopoolProcessor.ensureQueueHealth(client);
    const entry = await createNextEntryForUser(client, userId, {
      entrySource: 'purchase'
    });

    await walletService.debit(
      client,
      userId,
      ENTRY_AMOUNT,
      'autopool_entry',
      entry.id,
      {
        requestId,
        note: 'Global autopool entry purchase'
      }
    );

    const walletTransaction = await getWalletTransaction(client, userId, 'autopool_entry', entry.id);
    await autopoolRepository.createTransaction(client, {
      userId,
      entryId: entry.id,
      type: 'ENTRY',
      amount: ENTRY_AMOUNT,
      sourceUserId: userId,
      walletTransactionId: walletTransaction?.id || null,
      requestId,
      metadata: {
        entrySource: 'purchase',
        cycleNumber: Number(entry.cycle_number || 0),
        recycleCount: Number(entry.recycle_count || 0)
      }
    });

    const context = {
      requestId,
      events: []
    };
    const placement = await placeEntryInQueue(client, entry, context);
    const dashboard = await getDashboardWithClient(client, userId);

    return {
      ...dashboard,
      requestId,
      duplicateRequest: false,
      queueHealth,
      placement,
      events: context.events
    };
  });
}

module.exports = {
  ENTRY_AMOUNT,
  MATRIX_SLOTS,
  OWNER_PAYOUT,
  UPLINE_PAYOUT,
  AUCTION_SHARE,
  RECYCLE_AMOUNT,
  AUCTIONS_WALLET_TYPE,
  RECYCLE_CONFIRMATION,
  getDashboard,
  getHistory,
  enterAutopool
};
