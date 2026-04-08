import { apiFetch } from '@/lib/api/client';

const allowedAuctionStatuses = new Set(['all', 'live', 'upcoming', 'ended', 'cancelled']);
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
    if (allowedAuctionStatuses.has(safeStatus) && safeStatus !== 'all') next.status = safeStatus;
  }
  if (typeof params.kind === 'string') {
    const normalizedKind = params.kind.trim().toLowerCase();
    if (['bids', 'joined', 'wins', 'history'].includes(normalizedKind)) next.kind = normalizedKind;
  }
  if (typeof params.search === 'string' && params.search.trim()) next.search = params.search.trim().slice(0, 120);
  const page = Number(params.page);
  next.page = Number.isInteger(page) && page > 0 ? page : 1;
  const limit = Number(params.limit);
  next.limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 100;
  return next;
}

function withQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
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

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLeaderboard(entries = []) {
  return Array.isArray(entries)
    ? entries.map((entry) => ({
        ...entry,
        rank: toNumber(entry?.rank),
        total_entries: toNumber(entry?.total_entries),
        total_bids: toNumber(entry?.total_bids),
        total_spent: toNumber(entry?.total_spent)
      }))
    : [];
}

function normalizeRewardDistribution(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  return {
    ...entry,
    amount_spent: toNumber(entry.amount_spent),
    cash_awarded: toNumber(entry.cash_awarded),
    btct_awarded: toNumber(entry.btct_awarded),
    total_entries: toNumber(entry.total_entries),
    total_bids: toNumber(entry.total_bids),
    wallet_transaction_id: entry.wallet_transaction_id || null,
    credited_wallet_type: entry.credited_wallet_type || null
  };
}

function normalizeResultReveal(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  return {
    ...entry
  };
}

export function normalizeAuctionStatus(...statuses) {
  for (const value of statuses) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim().toLowerCase();
    const mapped = auctionStatusAliases[normalized] || normalized;
    if (mapped !== 'all' && allowedAuctionStatuses.has(mapped)) return mapped;
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

  const winners = Array.isArray(auction.winners)
    ? auction.winners.map((winner) => ({
        ...winner,
        winner_mode: winner.winner_mode || 'highest',
        selection_rank: toNumber(winner.selection_rank),
        sequence_position: winner.sequence_position === null || winner.sequence_position === undefined ? null : toNumber(winner.sequence_position),
        total_bids_snapshot: toNumber(winner.total_bids_snapshot),
        total_entries_snapshot: toNumber(winner.total_entries_snapshot),
        winning_entry_count: toNumber(winner.winning_entry_count),
        allocation_ratio: toNumber(winner.allocation_ratio),
        allocation_quantity: toNumber(winner.allocation_quantity),
        prize_type: winner.prize_type || 'product',
        prize_amount: winner.prize_amount === null || winner.prize_amount === undefined ? null : toNumber(winner.prize_amount),
        credited_wallet_type: winner.credited_wallet_type || null,
        credited_at: winner.credited_at || null,
        wallet_transaction_id: winner.wallet_transaction_id || null,
        selection_metadata: winner.selection_metadata || {}
      }))
    : [];

  return {
    ...auction,
    status,
    computed_status: status,
    storefront_status: status,
    title: auction.title || auction.product_name || 'Untitled auction',
    image_url: auction.image_url || images[0] || '',
    gallery: Array.from(new Set(images)),
    display_price: toNumber(
      auction.entry_price
      ?? auction.display_current_bid
      ?? auction.current_bid
      ?? auction.starting_price
      ?? 0
    ),
    totalCapacity: toNumber(auction.totalCapacity),
    capacityFilled: toNumber(auction.capacityFilled),
    capacityRemaining: toNumber(auction.capacityRemaining),
    capacityPercent: toNumber(auction.capacityPercent),
    total_entries: toNumber(auction.total_entries),
    total_bids: toNumber(auction.total_bids),
    auction_type: auction.auction_type || 'product',
    prize_amount: auction.prize_amount === null || auction.prize_amount === undefined ? null : toNumber(auction.prize_amount),
    prize_distribution_type: auction.prize_distribution_type || 'per_winner',
    each_winner_amount: auction.each_winner_amount === null || auction.each_winner_amount === undefined ? null : toNumber(auction.each_winner_amount),
    rank_prizes: Array.isArray(auction.rank_prizes)
      ? auction.rank_prizes.map((entry) => ({
          ...entry,
          winner_rank: toNumber(entry.winner_rank || entry.winnerRank),
          prize_amount: toNumber(entry.prize_amount || entry.prizeAmount)
        }))
      : [],
    winner_count: toNumber(auction.winner_count, 1),
    actualWinnerCount: toNumber(auction.actualWinnerCount),
    participantCount: toNumber(auction.participantCount),
    myEntryCount: toNumber(auction.myEntryCount),
    myTotalSpend: toNumber(auction.myTotalSpend),
    myPosition: toNumber(auction.myPosition),
    myTotalBids: toNumber(auction.myTotalBids),
    btctPrice: toNumber(auction.btctPrice, 0.1),
    participated: Boolean(auction.participated),
    resultFinalized: Boolean(auction.resultFinalized),
    revealEligible: Boolean(auction.revealEligible),
    latestBidder: auction.latestBidder
      ? {
          ...auction.latestBidder,
          entry_count: toNumber(auction.latestBidder.entry_count),
          total_amount: toNumber(auction.latestBidder.total_amount)
        }
      : null,
    topParticipant: auction.topParticipant
      ? {
          ...auction.topParticipant,
          rank: toNumber(auction.topParticipant.rank),
          total_entries: toNumber(auction.topParticipant.total_entries),
          total_bids: toNumber(auction.topParticipant.total_bids)
        }
      : null,
    participants: normalizeLeaderboard(auction.participants),
    leaderboard: normalizeLeaderboard(auction.leaderboard),
    winners,
    winner_modes: Array.isArray(auction.winner_modes) ? auction.winner_modes : ['highest'],
    rewardDistribution: normalizeRewardDistribution(auction.rewardDistribution),
    rewardDistributions: Array.isArray(auction.rewardDistributions) ? auction.rewardDistributions.map(normalizeRewardDistribution) : [],
    resultReveal: normalizeResultReveal(auction.resultReveal),
    winnerUsernames: Array.isArray(auction.winnerUsernames) ? auction.winnerUsernames : []
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

export async function revealAuctionResult(id) {
  return normalizeAuctionEnvelope(
    toEnvelope(
      await apiFetch(`/auctions/${id}/reveal`, {
        method: 'POST'
      })
    )
  );
}

export async function getMyAuctionHistory(params = {}) {
  const query = withQuery(normalizeAuctionParams(params));
  const payload = await apiFetch(`/auctions/me/history${query}`);

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[auction.history.response.raw]', { query, payload });
  }

  const normalized = normalizeAuctionEnvelope(toEnvelope(payload));

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[auction.history.response.normalized]', {
      query,
      summary: normalized?.summary || null,
      itemCount: Array.isArray(normalized?.data) ? normalized.data.length : null,
      pagination: normalized?.pagination || null
    });
  }

  return normalized;
}
