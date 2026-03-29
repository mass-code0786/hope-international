const { withTransaction } = require('../db/pool');
const { normalizePagination, buildPagination } = require('../utils/pagination');
const { ApiError } = require('../utils/ApiError');
const auctionRepository = require('../repositories/auctionRepository');
const walletService = require('./walletService');

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

function deriveAuctionStatus({ status, isActive, startAt, endAt, cancelledAt, closedAt, totalEntries = 0, hiddenCapacity = Number.MAX_SAFE_INTEGER, now = new Date() }) {
  if (status === 'cancelled' || cancelledAt) return 'cancelled';
  if (status === 'ended' || closedAt || Number(totalEntries) >= Number(hiddenCapacity)) return 'ended';
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

  const entryPrice = validateAuctionRange(payload.entryPrice ?? before?.entry_price ?? payload.startingPrice ?? before?.starting_price, 'Fixed entry price');
  const hiddenCapacity = Number(payload.hiddenCapacity ?? before?.hidden_capacity ?? 0);
  if (!Number.isInteger(hiddenCapacity) || hiddenCapacity <= 0) {
    throw new ApiError(400, 'Hidden capacity must be a positive whole number');
  }

  const stockQuantity = Number(payload.stockQuantity ?? before?.stock_quantity ?? 1);
  if (!Number.isInteger(stockQuantity) || stockQuantity <= 0) {
    throw new ApiError(400, 'Stock quantity must be a positive whole number');
  }

  const rewardMode = String(payload.rewardMode ?? before?.reward_mode ?? 'stock').trim().toLowerCase();
  if (!['stock', 'split'].includes(rewardMode)) {
    throw new ApiError(400, 'Reward mode must be stock or split');
  }

  const rewardValueRaw = payload.rewardValue ?? before?.reward_value;
  const rewardValue = rewardValueRaw === null || rewardValueRaw === undefined || rewardValueRaw === ''
    ? null
    : validateAuctionRange(rewardValueRaw, 'Reward value');

  const isActive = payload.isActive ?? before?.is_active ?? true;
  const cancelledAt = payload.cancelledAt ?? before?.cancelled_at ?? null;
  const closedAt = payload.closedAt ?? before?.closed_at ?? null;
  const totalEntries = Number(payload.totalEntries ?? before?.total_entries ?? 0);
  const winnerCount = Number(payload.winnerCount ?? before?.winner_count ?? 0);

  return {
    productId: payload.productId ?? before?.product_id ?? null,
    title: String(payload.title ?? before?.title ?? '').trim(),
    shortDescription: String(payload.shortDescription ?? before?.short_description ?? '').trim(),
    description: String(payload.description ?? before?.description ?? '').trim(),
    specifications: normalizeSpecs(payload.specifications ?? before?.specifications ?? []),
    imageUrl: String(payload.imageUrl ?? before?.image_url ?? '').trim(),
    gallery: normalizeGallery(payload.gallery ?? before?.gallery ?? [], String(payload.imageUrl ?? before?.image_url ?? '').trim()),
    startingPrice: entryPrice,
    minBidIncrement: entryPrice,
    currentBid: entryPrice,
    entryPrice,
    hiddenCapacity,
    stockQuantity,
    rewardMode,
    rewardValue,
    totalEntries,
    hasTie: Boolean(payload.hasTie ?? before?.has_tie ?? false),
    winnerCount: Number.isInteger(winnerCount) && winnerCount >= 0 ? winnerCount : 0,
    startAt,
    endAt,
    status: payload.status || deriveAuctionStatus({
      status: before?.status,
      isActive,
      startAt,
      endAt,
      cancelledAt,
      closedAt,
      totalEntries,
      hiddenCapacity
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

function buildWinnerAllocations(auction, topParticipants) {
  if (!topParticipants.length) return [];

  const winnerCount = topParticipants.length;
  const allocationRatio = Number((1 / winnerCount).toFixed(6));
  const stockQuantity = Number(auction.stock_quantity || 1);
  const rewardValue = Number(auction.reward_value || 0);
  const allocationQuantity = auction.reward_mode === 'split'
    ? Number((rewardValue / winnerCount).toFixed(2))
    : Number((stockQuantity / winnerCount).toFixed(2));

  return topParticipants.map((participant) => ({
    userId: participant.user_id,
    winningEntryCount: Number(participant.total_entries || 0),
    allocationRatio,
    allocationQuantity,
    rewardMode: auction.reward_mode || 'stock'
  }));
}

function stripPrivateFields(auction) {
  if (!auction) return auction;

  const winners = Array.isArray(auction.winners)
    ? auction.winners.map((winner) => ({
        user_id: winner.user_id,
        username: winner.username,
        winning_entry_count: winner.winning_entry_count,
        allocation_ratio: winner.allocation_ratio,
        allocation_quantity: winner.allocation_quantity,
        reward_mode: winner.reward_mode,
        created_at: winner.created_at
      }))
    : [];

  const participants = Array.isArray(auction.participants)
    ? auction.participants.map((participant) => ({
        user_id: participant.user_id,
        username: participant.username,
        joined_at: participant.joined_at,
        last_bid_at: participant.last_bid_at,
        total_bids: participant.total_bids,
        total_entries: participant.total_entries,
        highest_bid: participant.highest_bid
      }))
    : [];

  const bidHistory = Array.isArray(auction.bidHistory)
    ? auction.bidHistory.map((bid) => ({
        id: bid.id,
        user_id: bid.user_id,
        username: bid.username,
        amount: bid.amount,
        entry_count: bid.entry_count,
        total_amount: bid.total_amount,
        created_at: bid.created_at
      }))
    : [];

  const {
    hidden_capacity,
    participants: _participants,
    bidHistory: _bidHistory,
    winners: _winners,
    created_by_username,
    updated_by_username,
    winner_email,
    ...rest
  } = auction;

  return {
    ...rest,
    bidHistory,
    participants,
    winners
  };
}

function shapeAuction(auction, options = {}) {
  const includeAdminFields = options.includeAdminFields === true;
  return includeAdminFields ? auction : stripPrivateFields(auction);
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
    closedAt: auction.closed_at,
    totalEntries: auction.total_entries,
    hiddenCapacity: auction.hidden_capacity
  });

  if (derived !== 'ended' || auction.status === 'cancelled') {
    if (auction.status !== derived && auction.status !== 'cancelled') {
      await auctionRepository.updateAuction(client, auctionId, {
        ...sanitizeAuctionPayload({}, auction),
        status: derived,
        updatedBy: auction.updated_by
      });
    }
    return auctionRepository.getAuctionById(client, auctionId);
  }

  const topParticipants = await auctionRepository.getTopParticipants(client, auctionId);
  const winners = buildWinnerAllocations(auction, topParticipants);
  await auctionRepository.replaceAuctionWinners(client, auctionId, winners);

  const winningBid = await auctionRepository.getHighestBid(client, auctionId);
  const primaryWinner = winners[0] || null;

  await auctionRepository.updateAuction(client, auctionId, {
    ...sanitizeAuctionPayload({}, auction),
    status: 'ended',
    isActive: false,
    closedAt: auction.closed_at || new Date().toISOString(),
    closeReason: auction.close_reason || (Number(auction.total_entries) >= Number(auction.hidden_capacity) ? 'Hidden capacity reached' : 'Auction ended automatically'),
    winnerUserId: primaryWinner?.userId || null,
    winningBidId: winningBid?.id || null,
    hasTie: winners.length > 1,
    winnerCount: winners.length,
    totalEntries: Number(auction.total_entries || 0),
    updatedBy: auction.updated_by
  });

  return auctionRepository.getAuctionById(client, auctionId);
}

async function buildAuctionDetails(client, auctionId, currentUserId = null, options = {}) {
  let auction = await auctionRepository.getAuctionById(client, auctionId);
  if (!auction) throw new ApiError(404, 'Auction not found');

  if (auction.computed_status === 'ended' && auction.status !== 'cancelled') {
    auction = await ensureAuctionResolved(client, auctionId);
  }

  const [bids, participants, winners] = await Promise.all([
    auctionRepository.listAuctionBids(client, auctionId, 100),
    auctionRepository.listAuctionParticipants(client, auctionId),
    auctionRepository.listAuctionWinners(client, auctionId)
  ]);

  const myEntryCount = currentUserId
    ? bids.filter((bid) => bid.user_id === currentUserId).reduce((sum, bid) => sum + Number(bid.entry_count || 0), 0)
    : 0;
  const myTotalSpend = currentUserId
    ? bids.filter((bid) => bid.user_id === currentUserId).reduce((sum, bid) => sum + Number(bid.total_amount || 0), 0)
    : 0;

  return shapeAuction({
    ...auction,
    bidHistory: bids,
    participants,
    winners,
    myEntryCount,
    myTotalSpend: roundMoney(myTotalSpend),
    isWinner: winners.some((winner) => winner.user_id === currentUserId)
  }, options);
}

async function listAuctions(_userId, filters = {}, paginationInput = {}, options = {}) {
  const pagination = normalizePagination(paginationInput);
  const result = await withTransaction(async (client) => {
    const initial = await auctionRepository.listAuctions(client, {
      ...filters,
      onlyActive: filters.onlyActive ?? false
    }, pagination);

    for (const auction of initial.items) {
      if (auction.computed_status === 'ended' && auction.status !== 'cancelled') {
        await ensureAuctionResolved(client, auction.id);
      }
    }

    return auctionRepository.listAuctions(client, {
      ...filters,
      onlyActive: filters.onlyActive ?? false
    }, pagination);
  });

  return {
    data: result.items.map((auction) => shapeAuction(auction, options)),
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function getAuctionDetailsWithClient(client, auctionId, currentUserId = null, options = {}) {
  return buildAuctionDetails(client, auctionId, currentUserId, options);
}

async function getAuctionDetails(auctionId, currentUserId = null, options = {}) {
  return withTransaction((client) => getAuctionDetailsWithClient(client, auctionId, currentUserId, options));
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
      closedAt: auction.closed_at,
      totalEntries: auction.total_entries,
      hiddenCapacity: auction.hidden_capacity
    });

    if (liveStatus === 'ended') {
      await ensureAuctionResolved(client, auctionId);
      throw new ApiError(400, 'Auction has already ended');
    }

    if (auction.status === 'cancelled' || auction.cancelled_at) {
      throw new ApiError(400, 'Auction is cancelled');
    }

    if (liveStatus !== 'live') {
      throw new ApiError(400, liveStatus === 'upcoming' ? 'Auction has not started yet' : 'Auction is not available for entries');
    }

    const entryCount = Number(payload.entryCount || 1);
    if (!Number.isInteger(entryCount) || entryCount <= 0) {
      throw new ApiError(400, 'Entry count must be a positive whole number');
    }

    const remainingCapacity = Number(auction.hidden_capacity || 0) - Number(auction.total_entries || 0);
    if (entryCount > remainingCapacity) {
      throw new ApiError(400, 'Not enough capacity remaining for that many entries');
    }

    const entryPrice = validateAuctionRange(auction.entry_price || auction.starting_price, 'Fixed entry price');
    const totalAmount = roundMoney(entryPrice * entryCount);

    await walletService.debit(client, userId, totalAmount, 'auction_entry', auctionId, {
      auctionId,
      entryCount,
      entryPrice
    });

    const bid = await auctionRepository.createBid(client, {
      auctionId,
      userId,
      entryPrice,
      entryCount,
      totalAmount
    });
    await auctionRepository.upsertParticipant(client, { auctionId, userId, entryCount, totalAmount });

    const totalEntries = Number(auction.total_entries || 0) + entryCount;
    await auctionRepository.updateAuction(client, auctionId, {
      ...sanitizeAuctionPayload({}, auction),
      totalEntries,
      totalBids: Number(auction.total_bids || 0) + 1,
      status: totalEntries >= Number(auction.hidden_capacity) ? 'ended' : 'live',
      closedAt: totalEntries >= Number(auction.hidden_capacity) ? new Date().toISOString() : auction.closed_at,
      closeReason: totalEntries >= Number(auction.hidden_capacity) ? 'Hidden capacity reached' : auction.close_reason,
      updatedBy: userId
    });

    if (totalEntries >= Number(auction.hidden_capacity)) {
      await ensureAuctionResolved(client, auctionId);
    }

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
      if (auction.computed_status === 'ended' && auction.status !== 'cancelled') {
        await ensureAuctionResolved(client, auction.id);
      }
    }

    const refreshed = await auctionRepository.listUserAuctionHistory(client, userId, filters, pagination);
    const summary = await auctionRepository.getUserBidStats(client, userId);
    return { history: refreshed, summary };
  });

  return {
    data: result.history.items.map((auction) => shapeAuction(auction)),
    summary: result.summary,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.history.total })
  };
}

module.exports = {
  MIN_AUCTION_PRICE,
  MAX_AUCTION_PRICE,
  listAuctions,
  getAuctionDetails,
  getAuctionDetailsWithClient,
  placeBid,
  listMyAuctionHistory,
  ensureAuctionResolved,
  sanitizeAuctionPayload,
  deriveAuctionStatus,
  validateAuctionRange
};


