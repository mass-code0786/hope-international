import { apiFetch } from '@/lib/api/client';

const DEFAULT_AUTOPOOL_ENTRY_AMOUNT = 2;
const DEFAULT_PACKAGE_AMOUNTS = [2, 99, 313, 786];
const AUTOPOOL_WALLET_SOURCE_ALIASES = Object.freeze({
  autopool_entry: ['autopool_entry'],
  autopool_matrix_income: ['autopool_matrix_income'],
  sponsor_pool_income: ['sponsor_pool_income', 'autopool_upline_income'],
  autopool_bonus_share: ['autopool_bonus_share', 'autopool_auction_share']
});

function toEnvelope(payload) {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return {
      data: payload.data ?? null,
      pagination: payload.pagination ?? null,
      summary: payload.summary ?? null,
      message: payload.message ?? ''
    };
  }

  return {
    data: payload ?? null,
    pagination: null,
    summary: null,
    message: ''
  };
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeFillProgress(progress, fallbackFilled = 0) {
  if (!progress || typeof progress !== 'object') {
    const filled = toNumber(fallbackFilled);
    return {
      filled,
      total: 3,
      label: `${filled}/3`
    };
  }

  const filled = toNumber(progress.filled, toNumber(fallbackFilled));
  const total = Math.max(1, toNumber(progress.total, 3));
  return {
    filled,
    total,
    label: progress.label || `${filled}/${total}`
  };
}

function matchesWalletSource(value, aliases = []) {
  const normalized = String(value || '').trim();
  if (!normalized) return false;
  return aliases.includes(normalized);
}

function normalizeWalletSource(value) {
  if (matchesWalletSource(value, AUTOPOOL_WALLET_SOURCE_ALIASES.sponsor_pool_income)) {
    return 'sponsor_pool_income';
  }
  if (matchesWalletSource(value, AUTOPOOL_WALLET_SOURCE_ALIASES.autopool_matrix_income)) {
    return 'autopool_matrix_income';
  }
  if (matchesWalletSource(value, AUTOPOOL_WALLET_SOURCE_ALIASES.autopool_bonus_share)) {
    return 'autopool_bonus_share';
  }
  if (matchesWalletSource(value, AUTOPOOL_WALLET_SOURCE_ALIASES.autopool_entry)) {
    return 'autopool_entry';
  }
  return value || null;
}

function normalizeUser(user) {
  if (!user || typeof user !== 'object') return null;
  const firstName = String(user.firstName || '').trim();
  const lastName = String(user.lastName || '').trim();
  const username = user.username || null;
  return {
    ...user,
    username,
    displayName: [firstName, lastName].filter(Boolean).join(' ').trim() || username || 'Member'
  };
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const children = Array.isArray(entry.children) ? entry.children : [];

  return {
    ...entry,
    packageAmount: toNumber(entry.packageAmount),
    matrixType: entry.matrixType || '1x3',
    cycleNumber: toNumber(entry.cycleNumber),
    recycleCount: toNumber(entry.recycleCount),
    filledSlotsCount: toNumber(entry.filledSlotsCount),
    fillProgress: normalizeFillProgress(entry.fillProgress, entry.filledSlotsCount),
    slotPosition: entry.slotPosition === null || entry.slotPosition === undefined ? null : toNumber(entry.slotPosition),
    queuePosition: entry.queuePosition === null || entry.queuePosition === undefined ? null : toNumber(entry.queuePosition),
    user: normalizeUser(entry.user),
    parent: entry.parent
      ? {
          ...entry.parent,
          cycleNumber: toNumber(entry.parent.cycleNumber),
          user: normalizeUser(entry.parent.user)
        }
      : null,
    children: children.map((child, index) => ({
      ...child,
      packageAmount: toNumber(child.packageAmount, toNumber(entry.packageAmount)),
      slotPosition: toNumber(child.slotPosition || (index + 1)),
      cycleNumber: child.cycleNumber === null || child.cycleNumber === undefined ? null : toNumber(child.cycleNumber),
      recycleCount: toNumber(child.recycleCount),
      filledSlotsCount: toNumber(child.filledSlotsCount),
      fillProgress: normalizeFillProgress(child.fillProgress, child.filledSlotsCount),
      user: normalizeUser(child.user),
      isEmpty: Boolean(child.isEmpty)
    }))
  };
}

function normalizePackage(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    ...item,
    amount: toNumber(item.amount),
    entryAmount: toNumber(item.entryAmount, toNumber(item.amount)),
    earnings: toNumber(item.earnings),
    myEntry: toNumber(item.myEntry),
    recycleCount: toNumber(item.recycleCount),
    totalEntries: toNumber(item.totalEntries),
    activeEntries: toNumber(item.activeEntries),
    completedCycles: toNumber(item.completedCycles),
    totalBonus: toNumber(item.totalBonus),
    ownerEarnings: toNumber(item.ownerEarnings),
    uplineEarnings: toNumber(item.uplineEarnings),
    currentCycleNumber: toNumber(item.currentCycleNumber),
    currentRecycleCount: toNumber(item.currentRecycleCount),
    currentFillCount: toNumber(item.currentFillCount),
    currentFillProgress: normalizeFillProgress(item.currentFillProgress, item.currentFillCount),
    currentEntry: normalizeEntry(item.currentEntry)
  };
}

function buildEmptyPackage(amount) {
  return {
    amount,
    entryAmount: amount,
    earnings: 0,
    myEntry: 0,
    recycleCount: 0,
    totalEntries: 0,
    activeEntries: 0,
    completedCycles: 0,
    totalBonus: 0,
    ownerEarnings: 0,
    uplineEarnings: 0,
    currentCycleNumber: 0,
    currentRecycleCount: 0,
    currentFillCount: 0,
    currentFillProgress: normalizeFillProgress(null, 0),
    currentEntry: null
  };
}

function normalizeIncomeSummary(data = {}) {
  return {
    totalIncome: toNumber(data.totalIncome ?? data.total_income),
    pool2Income: toNumber(data.pool2Income ?? data.pool_2_income),
    pool99Income: toNumber(data.pool99Income ?? data.pool_99_income),
    pool313Income: toNumber(data.pool313Income ?? data.pool_313_income),
    pool786Income: toNumber(data.pool786Income ?? data.pool_786_income),
    sponsorPoolIncome: toNumber(data.sponsorPoolIncome ?? data.sponsor_pool_income)
  };
}

export function buildEmptyAutopoolDashboardData() {
  const incomeSummary = normalizeIncomeSummary();
  return {
    config: null,
    packages: DEFAULT_PACKAGE_AMOUNTS.map(buildEmptyPackage),
    incomeSummary,
    ...incomeSummary,
    myEntry: 0,
    recycle: 0,
    entries: [],
    activeEntries: [],
    activeMatrices: [],
    stats: {
      myEntry: 0,
      recycle: 0,
      purchaseEntries: 0,
      totalRecycles: 0,
      completedCycles: 0,
      totalEarnings: 0,
      totalIncome: incomeSummary.totalIncome,
      sponsorPoolIncome: incomeSummary.sponsorPoolIncome,
      currentCycleNumber: 0,
      currentRecycleCount: 0,
      currentFillCount: 0,
      currentFillProgress: normalizeFillProgress(null, 0)
    },
    currentEntry: null
  };
}

function normalizeHistoryItem(item) {
  if (!item || typeof item !== 'object') return item;
  const walletSource = normalizeWalletSource(item.walletSource || item.wallet_source || item.metadata?.walletSource);
  return {
    ...item,
    amount: toNumber(item.amount),
    packageAmount: toNumber(item.packageAmount ?? item.package_amount),
    poolType: item.poolType === null || item.poolType === undefined ? toNumber(item.packageAmount ?? item.package_amount) : toNumber(item.poolType),
    cycleNumber: item.cycleNumber === null || item.cycleNumber === undefined
      ? (item.cycle_number === null || item.cycle_number === undefined ? null : toNumber(item.cycle_number))
      : toNumber(item.cycleNumber),
    recycleCount: item.recycleCount === null || item.recycleCount === undefined
      ? (item.recycle_count === null || item.recycle_count === undefined ? null : toNumber(item.recycle_count))
      : toNumber(item.recycleCount),
    sourceUser: normalizeUser(item.sourceUser),
    entryId: item.entryId || item.entry_id || item.matrixId || null,
    matrixId: item.matrixId || item.entryId || item.entry_id || null,
    purchaseDate: item.purchaseDate || item.purchase_date || null,
    completedAt: item.completedAt || item.completed_at || null,
    createdAt: item.createdAt || item.created_at || null,
    walletSource,
    walletTransactionId: item.walletTransactionId || item.wallet_transaction_id || null,
    completedEntryId: item.completedEntryId || item.completed_entry_id || null,
    recycleEntryId: item.recycleEntryId || item.recycle_entry_id || null,
    sourceEntryId: item.sourceEntryId || item.source_entry_id || null,
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {}
  };
}

function normalizeDashboardData(data) {
  const fallback = buildEmptyAutopoolDashboardData();
  const packages = Array.isArray(data?.packages) && data.packages.length
    ? data.packages.map(normalizePackage).filter(Boolean)
    : fallback.packages;
  const currentEntry = normalizeEntry(data?.currentEntry) || fallback.currentEntry;
  const incomeSummary = normalizeIncomeSummary(data?.incomeSummary || data);
  const activeEntries = Array.isArray(data?.activeEntries) ? data.activeEntries.map(normalizeEntry).filter(Boolean) : fallback.activeEntries;
  const activeMatrices = Array.isArray(data?.activeMatrices) ? data.activeMatrices.map(normalizeEntry).filter(Boolean) : activeEntries;
  const entries = Array.isArray(data?.entries) ? data.entries.map(normalizeEntry).filter(Boolean) : activeEntries;
  return {
    ...fallback,
    config: data?.config || fallback.config,
    packages,
    incomeSummary,
    ...incomeSummary,
    myEntry: toNumber(data?.myEntry, toNumber(data?.stats?.myEntry)),
    recycle: toNumber(data?.recycle, toNumber(data?.stats?.recycle)),
    entries,
    activeEntries,
    activeMatrices,
    stats: {
      ...fallback.stats,
      ...(data?.stats || {}),
      myEntry: toNumber(data?.stats?.myEntry, toNumber(data?.myEntry)),
      recycle: toNumber(data?.stats?.recycle, toNumber(data?.recycle)),
      purchaseEntries: toNumber(data?.stats?.purchaseEntries),
      totalRecycles: toNumber(data?.stats?.totalRecycles),
      completedCycles: toNumber(data?.stats?.completedCycles),
      totalEarnings: toNumber(data?.stats?.totalEarnings),
      totalIncome: toNumber(data?.stats?.totalIncome, incomeSummary.totalIncome),
      sponsorPoolIncome: toNumber(data?.stats?.sponsorPoolIncome, incomeSummary.sponsorPoolIncome),
      currentCycleNumber: toNumber(data?.stats?.currentCycleNumber),
      currentRecycleCount: toNumber(data?.stats?.currentRecycleCount),
      currentFillCount: toNumber(data?.stats?.currentFillCount),
      currentFillProgress: normalizeFillProgress(data?.stats?.currentFillProgress, data?.stats?.currentFillCount)
    },
    currentEntry
  };
}

export async function getAutopoolDashboard() {
  const envelope = toEnvelope(await apiFetch('/autopool'));
  return {
    ...envelope,
    data: normalizeDashboardData(envelope.data || {})
  };
}

export async function enterAutopool(payload = {}) {
  const packageAmount = toNumber(payload.packageAmount, DEFAULT_AUTOPOOL_ENTRY_AMOUNT);
  const isDefaultEntry = packageAmount === DEFAULT_AUTOPOOL_ENTRY_AMOUNT;
  const path = isDefaultEntry ? '/autopool/enter' : '/autopool/buy';
  const requestPayload = isDefaultEntry
    ? { requestId: payload.requestId }
    : payload;

  const envelope = toEnvelope(
    await apiFetch(path, {
      method: 'POST',
      body: JSON.stringify(requestPayload)
    })
  );

  return {
    ...envelope,
    data: {
      ...normalizeDashboardData(envelope.data || {}),
      placement: envelope.data?.placement || null,
      duplicateRequest: Boolean(envelope.data?.duplicateRequest),
      requestId: envelope.data?.requestId || null,
      packageAmount: toNumber(envelope.data?.packageAmount, packageAmount),
      events: Array.isArray(envelope.data?.events) ? envelope.data.events : []
    }
  };
}

export async function getAutopoolHistory(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const envelope = toEnvelope(await apiFetch(`/autopool/history${suffix}`));
  const payload = envelope.data && typeof envelope.data === 'object' && Array.isArray(envelope.data.items)
    ? envelope.data
    : {
        type: params.type || 'total',
        title: '',
        items: Array.isArray(envelope.data) ? envelope.data : [],
        pagination: envelope.pagination ?? null
      };

  return {
    ...envelope,
    type: payload.type || params.type || 'total',
    title: payload.title || '',
    items: Array.isArray(payload.items) ? payload.items.map(normalizeHistoryItem) : [],
    pagination: payload.pagination ?? envelope.pagination ?? null
  };
}
