import { apiFetch } from '@/lib/api/client';

const allowedAuctionStatuses = new Set(['live', 'upcoming', 'ended', 'cancelled']);

function normalizeAuctionParams(params = {}) {
  const next = {};
  if (typeof params.status === 'string') {
    const normalizedStatus = params.status.trim().toLowerCase();
    if (allowedAuctionStatuses.has(normalizedStatus)) next.status = normalizedStatus;
  }
  if (typeof params.search === 'string' && params.search.trim()) next.search = params.search.trim().slice(0, 120);
  const page = Number(params.page);
  if (Number.isInteger(page) && page > 0) next.page = page;
  const limit = Number(params.limit);
  if (Number.isInteger(limit) && limit > 0) next.limit = limit;
  return next;
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

function toEnvelope(payload) {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return { data: payload.data ?? null, pagination: payload.pagination ?? null, summary: payload.summary ?? null, message: payload.message ?? '' };
  }
  return { data: payload ?? null, pagination: null, summary: null, message: '' };
}

export async function getAuctions(params = {}) {
  return toEnvelope(await apiFetch(`/auctions${withQuery(normalizeAuctionParams(params))}`));
}

export async function getAuctionDetails(id) {
  return toEnvelope(await apiFetch(`/auctions/${id}`));
}

export async function placeAuctionBid(id, entryCount) {
  return toEnvelope(
    await apiFetch(`/auctions/${id}/bids`, {
      method: 'POST',
      body: JSON.stringify({ entryCount })
    })
  );
}

export async function getMyAuctionHistory(params = {}) {
  return toEnvelope(await apiFetch(`/auctions/me/history${withQuery(params)}`));
}
