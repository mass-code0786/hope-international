import { apiFetch } from '@/lib/api/client';

const supportStatuses = new Set(['open', 'replied', 'closed']);
const supportCategories = new Set(['order_issue', 'payment_issue', 'auction_issue', 'account_issue', 'seller_issue', 'other']);

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

function withQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return;
    query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

function normalizeFilters(params = {}) {
  const next = {};
  if (supportStatuses.has(params.status)) next.status = params.status;
  if (supportCategories.has(params.category)) next.category = params.category;
  if (typeof params.search === 'string' && params.search.trim()) next.search = params.search.trim().slice(0, 120);
  const page = Number(params.page);
  next.page = Number.isInteger(page) && page > 0 ? page : 1;
  const limit = Number(params.limit);
  next.limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 100;
  return next;
}

export async function getMySupportThreads(params = {}) {
  return toEnvelope(await apiFetch(`/support/threads${withQuery(normalizeFilters(params))}`));
}

export async function getMySupportThread(threadId) {
  return toEnvelope(await apiFetch(`/support/threads/${threadId}`));
}

export async function createMySupportThread(payload) {
  return toEnvelope(
    await apiFetch('/support/threads', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function sendMySupportMessage(threadId, payload) {
  return toEnvelope(
    await apiFetch(`/support/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export const supportCategoryOptions = [
  { value: 'order_issue', label: 'Order issue' },
  { value: 'payment_issue', label: 'Payment issue' },
  { value: 'auction_issue', label: 'Auction issue' },
  { value: 'account_issue', label: 'Account issue' },
  { value: 'seller_issue', label: 'Seller issue' },
  { value: 'other', label: 'Other' }
];
