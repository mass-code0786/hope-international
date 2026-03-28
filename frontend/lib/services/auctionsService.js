import { apiFetch } from '@/lib/api/client';

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

export async function getAuctions(params = {}) {
  return toEnvelope(await apiFetch(`/auctions${withQuery(params)}`));
}

export async function getAuctionDetails(id) {
  return toEnvelope(await apiFetch(`/auctions/${id}`));
}

export async function placeAuctionBid(id, amount) {
  return toEnvelope(
    await apiFetch(`/auctions/${id}/bids`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    })
  );
}

export async function getMyAuctionHistory(params = {}) {
  return toEnvelope(await apiFetch(`/auctions/me/history${withQuery(params)}`));
}
