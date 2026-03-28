const { withTransaction } = require('../db/pool');
const { normalizePagination, buildPagination } = require('../utils/pagination');
const { ApiError } = require('../utils/ApiError');
const auctionRepository = require('../repositories/auctionRepository');

const MIN_AUCTION_PRICE = 0.5;
const MAX_AUCTION_PRICE = 100;

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function normalizeSpecs(specifications) {
  if (!Array.isArray(specifications)) return [];
  return specifications
    .map((entry) => ({
      label: String(entry?.label || '').trim(),
      value: String(entry?.value || '').trim()
    }))
    .filter((entry) => entry.label && entry.value);
}

function normalizeGallery(gallery, fallback) {
  const urls = Array.isArray(gallery) ? gallery : [];
  const cleaned = urls.map((item) => String(item || '').trim()).filter(Boolean);
  if (fallback && !cleaned.includes(fallback)) cleaned.unshift(fallback);
  return cleaned;
}

function validateAuctionRange(value, label) {
  const amount = roundMoney(value);
  if (Number.isNaN(amount) || amount < MIN_AUCTION_PRICE || amount > MAX_AUCTION_PRICE) {
    throw new ApiError(400, `${label} must be between $${MIN_AUCTION_PRICE} and $${MAX_AUCTION_PRICE}`);
  }
  return amount;
}

function deriveAuctionStatus({ status, isActive, startAt, endAt, cancelledAt, closedAt, now = new Date() }) {
  if (status === 'cancelled' || cancelledAt) return 'cancelled';
  if (status === 'ended' || closedAt) return 'ended';
  if (!isActive) return now >= new Date(endAt) ? 'ended' : 'upcoming';
  if (now < new Date(startAt)) return 'upcoming';
  if (now >= new Date(endAt)) return 'ended';
  return 'live';
}

function sanitizeAuctionPayload(payload, before = null) {
  const startAt = payload.startAt || before?.start_at;
  const endAt = payload.endAt || before?.end_at;
  if (!startAt || !endAt || new Date(endAt) <= new Date(startAt)) {
    throw new ApiError(400, 'Auction end time must be later than start time');
  }

  const startingPrice = validateAuctionRange(payload.startingPrice ?? before?.starting_price, 'Starting price');
  const minBidIncrement = validateAuctionRange(payload.minBidIncrement ?? before?.min_bid_increment ?? MIN_AUCTION_PRICE, 'Minimum bid increment');
  const currentBid = roundMoney(before?.current_bid ?? payload.currentBid ?? startingPrice);
  const isActive = payload.isActive ?? before?.is_active ?? true;
  const cancelledAt = payload.cancelledAt ?? before?.cancelled_at ?? null;
  const closedAt = payload.closedAt ?? before?.closed_at ?? null;

  return {
    title: String(payload.title ?? before?.title ?? '').trim(),
    shortDescription: String(payload.shortDescription ?? before?.short_description ?? '').trim(),
    description: String(payload.description ?? before?.description ?? '').trim(),
    specifications: normalizeSpecs(payload.specifications ?? before?.specifications ?? []),
    imageUrl: String(payload.imageUrl ?? before?.image_url ?? '').trim(),
    gallery: normalizeGallery(payload.gallery ?? before?.gallery ?? [], String(payload.imageUrl ?? before?.image_url ?? '').trim()),
    startingPrice,
    minBidIncrement,
    currentBid: currentBid < startingPrice ? startingPrice : currentBid,
    startAt,
    endAt,
    status: payload.status || deriveAuctionStatus({
      status: before?.status,
      isActive,
      startAt,
      endAt,
      cancelledAt,
      closedAt
    }),
    isActive,
    cancelledAt,
    closedAt,
    closeReason: payload.closeReason ?? before?.close_reason ?? null,
    winnerUserId: payload.winnerUserId ?? before?.winner_user_id ?? null,
    winningBidId: payload.winningBidId ?? before?.winning_bid_id ?? null,
    totalBids: Number(payload.totalBids ?? before?.total_bids ?? 0)
  };
}

async function ensureAuctionResolved(client, auctionId) {
  const auction = await auctionRepository.getAuctionForUpdate(client, auctionId);
  if (!auction) {
    throw new ApiError(404, 'Auction not found');
  }

  const derived = deriveAuctionStatus({
    status: auction.status,
    isActive: auction.is_active,
    startAt: auction.start_at,
    endAt: auction.end_at,
    cancelledAt: auction.cancelled_at,
    closedAt: auction.closed_at
  });

  if (derived !== 'ended' || auction.status === 'cancelled' || auction.winner_user_id || auction.closed_at) {
    if (auction.status !== derived && auction.status !== 'cancelled') {
      await auctionRepository.updateAuction(client, auctionId, {
        ...sanitizeAuctionPayload({}, auction),
        status: derived,
        updatedBy: auction.updated_by
      });
    }
    return auctionRepository.getAuctionById(client, auctionId);
  }

  const highestBid = await auctionRepository.getHighestBid(client, auctionId);
  await auctionRepository.updateAuction(client, auctionId, {
    ...sanitizeAuctionPayload({}, auction),
    status: 'ended',
    closedAt: auction.closed_at || new Date().toISOString(),
    closeReason: auction.close_reason || 'Auction ended automatically',
    winnerUserId: highestBid?.user_id || null,
    winningBidId: highestBid?.id || null,
    currentBid: roundMoney(highestBid?.amount || auction.current_bid || auction.starting_price),
    updatedBy: auction.updated_by
  });
  return auctionRepository.getAuctionById(client, auctionId);
}

async function buildAuctionDetails(client, auctionId, currentUserId = null) {
  let auction = await auctionRepository.getAuctionById(client, auctionId);
  if (!auction) throw new ApiError(404, 'Auction not found');

  if (auction.computed_status === 'ended' && auction.status !== 'cancelled' && !auction.winner_user_id && !auction.closed_at) {
    auction = await ensureAuctionResolved(client, auctionId);
  }

  const [bids, participants] = await Promise.all([
    auctionRepository.listAuctionBids(client, auctionId, 100),
    auctionRepository.listAuctionParticipants(client, auctionId)
  ]);

  const myHighestBid = currentUserId
    ? bids.filter((bid) => bid.user_id === currentUserId).reduce((max, bid) => Math.max(max, Number(bid.amount || 0)), 0)
    : 0;

  return {
    ...auction,
    bidHistory: bids,
    participants,
    myHighestBid: roundMoney(myHighestBid)
  };
}

async function listAuctions(_userId, filters = {}, paginationInput = {}) {
  const pagination = normalizePagination(paginationInput);
  const result = await withTransaction(async (client) => {
    const initial = await auctionRepository.listAuctions(client, {
      ...filters,
      onlyActive: filters.onlyActive ?? true
    }, pagination);

    for (const auction of initial.items) {
      if (auction.computed_status === 'ended' && auction.status !== 'cancelled' && !auction.winner_user_id && !auction.closed_at) {
        await ensureAuctionResolved(client, auction.id);
      }
    }

    return auctionRepository.listAuctions(client, {
      ...filters,
      onlyActive: filters.onlyActive ?? true
    }, pagination);
  });

  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function getAuctionDetails(auctionId, currentUserId = null) {
  return withTransaction((client) => buildAuctionDetails(client, auctionId, currentUserId));
}

async function placeBid(auctionId, userId, payload) {
  return withTransaction(async (client) => {
    const auction = await auctionRepository.getAuctionForUpdate(client, auctionId);
    if (!auction) throw new ApiError(404, 'Auction not found');

    const liveStatus = deriveAuctionStatus({
      status: auction.status,
      isActive: auction.is_active,
      startAt: auction.start_at,
      endAt: auction.end_at,
      cancelledAt: auction.cancelled_at,
      closedAt: auction.closed_at
    });

    if (liveStatus === 'ended') {
      await ensureAuctionResolved(client, auctionId);
      throw new ApiError(400, 'Auction has already ended');
    }

    if (auction.status === 'cancelled' || auction.cancelled_at) {
      throw new ApiError(400, 'Auction is cancelled');
    }

    if (liveStatus !== 'live') {
      throw new ApiError(400, liveStatus === 'upcoming' ? 'Auction has not started yet' : 'Auction is not available for bids');
    }

    const amount = validateAuctionRange(payload.amount, 'Bid amount');
    const currentBid = roundMoney(auction.current_bid || auction.starting_price);
    const minRequiredBid = roundMoney(Math.min(MAX_AUCTION_PRICE, currentBid + Number(auction.min_bid_increment || MIN_AUCTION_PRICE)));

    if (amount < minRequiredBid) {
      throw new ApiError(400, `Bid must be at least $${minRequiredBid.toFixed(2)}`);
    }

    const bid = await auctionRepository.createBid(client, { auctionId, userId, amount });
    await auctionRepository.upsertParticipant(client, { auctionId, userId, amount });

    await auctionRepository.updateAuction(client, auctionId, {
      ...sanitizeAuctionPayload({}, auction),
      currentBid: amount,
      totalBids: Number(auction.total_bids || 0) + 1,
      status: 'live',
      updatedBy: userId
    });

    return {
      bid,
      auction: await buildAuctionDetails(client, auctionId, userId)
    };
  });
}

async function listMyAuctionHistory(userId, filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await withTransaction(async (client) => {
    const history = await auctionRepository.listUserAuctionHistory(client, userId, filters, pagination);

    for (const auction of history.items) {
      if (auction.computed_status === 'ended' && auction.status !== 'cancelled' && !auction.winner_user_id && !auction.closed_at) {
        await ensureAuctionResolved(client, auction.id);
      }
    }

    const refreshed = await auctionRepository.listUserAuctionHistory(client, userId, filters, pagination);
    const summary = await auctionRepository.getUserBidStats(client, userId);
    return { history: refreshed, summary };
  });

  return {
    data: result.history.items,
    summary: result.summary,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.history.total })
  };
}

module.exports = {
  MIN_AUCTION_PRICE,
  MAX_AUCTION_PRICE,
  listAuctions,
  getAuctionDetails,
  placeBid,
  listMyAuctionHistory,
  ensureAuctionResolved,
  sanitizeAuctionPayload,
  deriveAuctionStatus,
  validateAuctionRange
};
