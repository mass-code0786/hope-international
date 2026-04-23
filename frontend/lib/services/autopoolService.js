import { apiFetch } from '@/lib/api/client';

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
    cycleNumber: toNumber(entry.cycleNumber),
    recycleCount: toNumber(entry.recycleCount),
    filledSlotsCount: toNumber(entry.filledSlotsCount),
    slotPosition: entry.slotPosition === null || entry.slotPosition === undefined ? null : toNumber(entry.slotPosition),
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
      slotPosition: toNumber(child.slotPosition || (index + 1)),
      cycleNumber: child.cycleNumber === null || child.cycleNumber === undefined ? null : toNumber(child.cycleNumber),
      recycleCount: toNumber(child.recycleCount),
      filledSlotsCount: toNumber(child.filledSlotsCount),
      user: normalizeUser(child.user),
      isEmpty: Boolean(child.isEmpty)
    }))
  };
}

function normalizeHistoryItem(item) {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    amount: toNumber(item.amount),
    cycle_number: item.cycle_number === null || item.cycle_number === undefined ? null : toNumber(item.cycle_number),
    recycle_count: item.recycle_count === null || item.recycle_count === undefined ? null : toNumber(item.recycle_count),
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {}
  };
}

export async function getAutopoolDashboard() {
  const envelope = toEnvelope(await apiFetch('/autopool'));
  const data = envelope.data || {};
  return {
    ...envelope,
    data: {
      config: data.config || null,
      stats: data.stats || {},
      currentEntry: normalizeEntry(data.currentEntry),
      activeEntries: Array.isArray(data.activeEntries) ? data.activeEntries.map(normalizeEntry) : []
    }
  };
}

export async function enterAutopool(payload = {}) {
  const envelope = toEnvelope(
    await apiFetch('/autopool/enter', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
  const data = envelope.data || {};
  return {
    ...envelope,
    data: {
      ...data,
      currentEntry: normalizeEntry(data.currentEntry),
      activeEntries: Array.isArray(data.activeEntries) ? data.activeEntries.map(normalizeEntry) : []
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
  return {
    ...envelope,
    data: Array.isArray(envelope.data) ? envelope.data.map(normalizeHistoryItem) : []
  };
}
