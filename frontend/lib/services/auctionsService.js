import { apiFetch } from '@/lib/api/client';

const allowedAuctionStatuses = new Set(['live', 'upcoming', 'ended', 'cancelled']);
const auctionStatusAliases = {
  active: 'live',
  current: 'live',
  open: 'live',
  scheduled: 'upcoming',
  closed: 'ended',
  complete: 'ended',
  completed: 'ended'
};

function normalizeAuctionParams(params = {}) {
  const next = {};
  if (typeof params.status === 'string') {
    const normalizedStatus = params.status.trim().toLowerCase();
    const safeStatus = auctionStatusAliases[normalizedStatus] || normalizedStatus;
    if (allowedAuctionStatuses.has(safeStatus)) next.status = safeStatus;
  }
  if (typeof params.search === 'string' && params.search.trim()) next.search = params.search.trim().slice(0, 120);
  const page = Number(params.page);
  next.page = Number.isInteger(page) && page > 0 ? page : 1;
  const limit = Number(params.limit);
  next.limit = Number.isInteger(limit) && limit > 0 ? limit : 24;
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

export function normalizeAuctionStatus(...statuses) {
  for (const value of statuses) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim().toLowerCase();
    const mapped = auctionStatusAliases[normalized] || normalized;
    if (allowedAuctionStatuses.has(mapped)) return mapped;
  }
  return 'upcoming';
}

function normalizeAuction(auction) {
  if (!auction || typeof auction !== 'object') return auction;

  const status = normalizeAuctionStatus(auction.computed_status, auction.status, auction.storefront_status);
  const images = [
    auction.image_url,
    ...(Array.isArray(auction.gallery) ? auction.gallery : []),
    auction.product_image_url,
    ...(Array.isArray(auction.product_gallery) ? auction.product_gallery : [])
  ].filter(Boolean);

  return {
    ...auction,
    status,
    computed_status: status,
    storefront_status: status,
    title: auction.title || auction.product_name || 'Untitled auction',
    image_url: auction.image_url || images[0] || '',
    gallery: Array.from(new Set(images)),
    display_price: Number(
      auction.entry_price
      ?? auction.display_current_bid
      ?? auction.current_bid
      ?? auction.starting_price
      ?? 0
    ),
    total_entries: Number(auction.total_entries || 0),
    total_bids: Number(auction.total_bids || 0)
  };
}

function normalizeAuctionEnvelope(envelope) {
  const data = Array.isArray(envelope.data)
    ? envelope.data.map(normalizeAuction)
    : envelope.data && typeof envelope.data === 'object'
      ? normalizeAuction(envelope.data)
      : envelope.data;

  return {
    ...envelope,
    data
  };
}

export async function getAuctions(params = {}) {
  return normalizeAuctionEnvelope(toEnvelope(await apiFetch(`/auctions${withQuery(normalizeAuctionParams(params))}`)));
}

export async function getAuctionDetails(id) {
  return normalizeAuctionEnvelope(toEnvelope(await apiFetch(`/auctions/${id}`)));
}

export async function placeAuctionBid(id, entryCount) {
  return normalizeAuctionEnvelope(
    toEnvelope(
      await apiFetch(`/auctions/${id}/bids`, {
        method: 'POST',
        body: JSON.stringify({ entryCount })
      })
    )
  );
}

export async function getMyAuctionHistory(params = {}) {
  return normalizeAuctionEnvelope(toEnvelope(await apiFetch(`/auctions/me/history${withQuery(params)}`)));
}
