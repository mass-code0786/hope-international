const { withTransaction } = require('../db/pool');
const { normalizePagination, buildPagination } = require('../utils/pagination');
const { ApiError } = require('../utils/ApiError');
const auctionRepository = require('../repositories/auctionRepository');
const walletService = require('./walletService');

const MIN_AUCTION_PRICE = 0.10;
const MIN_REWARD_VALUE = 0.01;
const BTCT_USD_PRICE = 0.10;
const AUCTION_SCHEMA_ERROR_CODES = ['42P01', '42703', '42883', '42804'];

function isAuctionSchemaError(error) {
  return AUCTION_SCHEMA_ERROR_CODES.includes(error?.code);
}

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function roundBtct(value) {
  return Number(Number(value || 0).toFixed(4));
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
  if (Number.isNaN(amount) || amount < MIN_AUCTION_PRICE) {
    throw new ApiError(400, `${label} must be at least $${MIN_AUCTION_PRICE.toFixed(2)}`);
  }
  return amount;
}

function validateRewardValue(value) {
  const amount = roundMoney(value);
  if (Number.isNaN(amount) || amount < MIN_REWARD_VALUE) {
    throw new ApiError(400, 'Reward value must be greater than $0.00');
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
    : validateRewardValue(rewardValueRaw);

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
    category: String(payload.category ?? before?.category ?? '').trim() || null,
    itemCondition: String(payload.itemCondition ?? before?.item_condition ?? '').trim() || null,
    shippingDetails: String(payload.shippingDetails ?? before?.shipping_details ?? '').trim() || null,
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

function sanitizePublicLeaderboardEntry(participant, currentUserId = null) {
  return {
    user_id: participant.user_id,
    username: participant.username,
    rank: Number(participant.rank || 0),
    total_bids: Number(participant.total_bids || 0),
    total_entries: Number(participant.total_entries || 0),
    last_bid_at: participant.last_bid_at,
    joined_at: participant.joined_at,
    is_current_user: Boolean(currentUserId && String(participant.user_id) === String(currentUserId))
  };
}

function sanitizeRewardDistribution(distribution) {
  if (!distribution) return null;
  return {
    user_id: distribution.user_id,
    username: distribution.username,
    result_type: distribution.result_type,
    amount_spent: roundMoney(distribution.amount_spent || 0),
    total_entries: Number(distribution.total_entries || 0),
    total_bids: Number(distribution.total_bids || 0),
    btct_awarded: roundBtct(distribution.btct_awarded || 0),
    distributed_at: distribution.distributed_at,
    metadata: distribution.metadata || {}
  };
}

function sanitizeRevealState(revealState) {
  if (!revealState) return null;
  return {
    revealed_at: revealState.revealed_at,
    created_at: revealState.created_at
  };
}

async function settleAuctionRewards(client, auction, winners) {
  const leaderboard = await auctionRepository.listAuctionLeaderboard(client, auction.id, 500);
  if (!leaderboard.length) return [];

  const winnerIds = new Set(winners.map((winner) => String(winner.userId)));
  const distributions = [];

  for (const participant of leaderboard) {
    const amountSpent = roundMoney(participant.total_spent || 0);
    const isWinner = winnerIds.has(String(participant.user_id));
    const btctAwarded = isWinner ? 0 : roundBtct(amountSpent / BTCT_USD_PRICE);
    const existing = await auctionRepository.getAuctionRewardDistribution(client, auction.id, participant.user_id);

    let btctTransactionId = existing?.btct_transaction_id || null;
    let distributedAt = existing?.distributed_at || new Date().toISOString();

    if (!isWinner && btctAwarded > 0 && !btctTransactionId) {
      const reward = await walletService.creditBtct(client, participant.user_id, btctAwarded, 'auction_loss_compensation', auction.id, {
        auctionId: auction.id,
        auctionTitle: auction.title,
        amountSpent,
        btctAwarded,
        btctPrice: BTCT_USD_PRICE,
        totalEntries: Number(participant.total_entries || 0),
        totalBids: Number(participant.total_bids || 0)
      });
      btctTransactionId = reward.transaction.id;
      distributedAt = reward.transaction.created_at || distributedAt;
    }

    const distribution = await auctionRepository.upsertAuctionRewardDistribution(client, {
      auctionId: auction.id,
      userId: participant.user_id,
      resultType: isWinner ? 'winner' : 'btct_compensation',
      amountSpent,
      totalEntries: Number(participant.total_entries || 0),
      totalBids: Number(participant.total_bids || 0),
      btctAwarded,
      btctTransactionId,
      distributedAt,
      metadata: {
        btctPrice: BTCT_USD_PRICE,
        auctionTitle: auction.title,
        isWinner,
        winnerCount: winners.length
      }
    });

    distributions.push(distribution);
  }

  return distributions;
}

function buildCapacitySummary(auction) {
  const totalCapacity = Math.max(0, Number(auction?.hidden_capacity || 0));
  const filledEntries = Math.max(0, Number(auction?.total_entries || 0));
  const remainingEntries = Math.max(totalCapacity - filledEntries, 0);
  const percentFilled = totalCapacity > 0 ? Math.min(100, Math.round((filledEntries / totalCapacity) * 100)) : 0;

  return {
    totalCapacity,
    filledEntries,
    remainingEntries,
    percentFilled
  };
}

function stripPrivateFields(auction) {
  if (!auction) return auction;

  const currentUserId = auction.current_user_id || null;

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
        highest_bid: participant.highest_bid,
        rank: Number(participant.rank || 0)
      }))
    : [];

  const leaderboard = Array.isArray(auction.leaderboard)
    ? auction.leaderboard.map((participant) => sanitizePublicLeaderboardEntry(participant, currentUserId))
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

  const rewardDistribution = sanitizeRewardDistribution(auction.rewardDistribution);
  const resultReveal = sanitizeRevealState(auction.resultReveal);
  const capacity = buildCapacitySummary(auction);

  const {
    hidden_capacity,
    participants: _participants,
    leaderboard: _leaderboard,
    rewardDistributions: _rewardDistributions,
    resultReveal: _resultReveal,
    current_user_id: _currentUserId,
    bidHistory: _bidHistory,
    winners: _winners,
    created_by_username,
    updated_by_username,
    winner_email,
    ...rest
  } = auction;

  return {
    ...rest,
    totalCapacity: capacity.totalCapacity,
    capacityFilled: capacity.filledEntries,
    capacityRemaining: capacity.remainingEntries,
    capacityPercent: capacity.percentFilled,
    bidHistory,
    participants,
    leaderboard,
    winners,
    rewardDistribution,
    resultReveal
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

  const settledAuction = await auctionRepository.getAuctionById(client, auctionId);
  if (settledAuction) {
    await settleAuctionRewards(client, settledAuction, winners);
  }

  return auctionRepository.getAuctionById(client, auctionId);
}

async function buildAuctionDetails(client, auctionId, currentUserId = null, options = {}) {
  let auction = await auctionRepository.getAuctionById(client, auctionId);
  if (!auction) throw new ApiError(404, 'Auction not found');

  if (auction.computed_status === 'ended' && auction.status !== 'cancelled') {
    auction = await ensureAuctionResolved(client, auctionId);
  }

  const [bids, participants, winners, rewardDistributions, resultReveal] = await Promise.all([
    auctionRepository.listAuctionBids(client, auctionId, 100),
    auctionRepository.listAuctionLeaderboard(client, auctionId, 200),
    auctionRepository.listAuctionWinners(client, auctionId),
    auctionRepository.listAuctionRewardDistributions(client, auctionId),
    currentUserId ? auctionRepository.getAuctionResultReveal(client, auctionId, currentUserId) : Promise.resolve(null)
  ]);

  const currentParticipant = currentUserId
    ? participants.find((participant) => String(participant.user_id) === String(currentUserId)) || null
    : null;
  const myEntryCount = currentParticipant
    ? Number(currentParticipant.total_entries || 0)
    : bids.filter((bid) => bid.user_id === currentUserId).reduce((sum, bid) => sum + Number(bid.entry_count || 0), 0);
  const myTotalSpend = currentParticipant
    ? roundMoney(currentParticipant.total_spent || 0)
    : roundMoney(bids.filter((bid) => bid.user_id === currentUserId).reduce((sum, bid) => sum + Number(bid.total_amount || 0), 0));
  const rewardDistribution = currentUserId
    ? rewardDistributions.find((entry) => String(entry.user_id) === String(currentUserId)) || null
    : null;
  const latestBid = bids[0] || null;
  const topParticipant = participants[0] || null;
  const resultFinalized = auction.computed_status === 'ended' && winners.length > 0 && rewardDistributions.length >= participants.length;
  const revealEligible = Boolean(currentParticipant && resultFinalized);

  return shapeAuction({
    ...auction,
    bidHistory: bids,
    participants,
    leaderboard: participants.slice(0, 10),
    rewardDistributions,
    rewardDistribution,
    participantCount: participants.length,
    latestBidder: latestBid
      ? {
          user_id: latestBid.user_id,
          username: latestBid.username,
          entry_count: Number(latestBid.entry_count || 0),
          total_amount: roundMoney(latestBid.total_amount || 0),
          created_at: latestBid.created_at
        }
      : null,
    topParticipant: topParticipant
      ? {
          user_id: topParticipant.user_id,
          username: topParticipant.username,
          total_entries: Number(topParticipant.total_entries || 0),
          total_bids: Number(topParticipant.total_bids || 0),
          rank: Number(topParticipant.rank || 1)
        }
      : null,
    winners,
    myEntryCount,
    myTotalSpend,
    myPosition: Number(currentParticipant?.rank || 0),
    myTotalBids: Number(currentParticipant?.total_bids || 0),
    isWinner: winners.some((winner) => winner.user_id === currentUserId),
    current_user_id: currentUserId,
    btctPrice: BTCT_USD_PRICE,
    participated: Boolean(currentParticipant),
    resultFinalized,
    revealEligible,
    resultReveal,
    winnerUsernames: winners.map((winner) => winner.username).filter(Boolean)
  }, options);
}

async function listAuctions(_userId, filters = {}, paginationInput = {}, options = {}) {
  const pagination = normalizePagination(paginationInput);

  try {
    const result = await withTransaction((client) => auctionRepository.listAuctions(client, {
      ...filters,
      onlyActive: filters.onlyActive ?? false
    }, pagination));

    if (!filters.status || filters.status === 'all') {
      console.log('[auctions.list.response]', {
        count: Array.isArray(result.items) ? result.items.length : 0,
        total: Number(result.total || 0)
      });
    }

    return {
      data: result.items.map((auction) => shapeAuction(auction, options)),
      pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
    };
  } catch (error) {
    console.error('[auctions.list] failed', {
      code: error?.code || null,
      message: error?.message || 'Unknown auctions list failure',
      filters,
      pagination,
      stack: error?.stack || null
    });

    if (isAuctionSchemaError(error)) {
      const fallback = await withTransaction((client) => auctionRepository.listAuctionsCompat(client, {
        ...filters,
        onlyActive: filters.onlyActive ?? false
      }, pagination));

      if (!filters.status || filters.status === 'all') {
        console.log('[auctions.list.response.compat]', {
          count: Array.isArray(fallback.items) ? fallback.items.length : 0,
          total: Number(fallback.total || 0)
        });
      }

      return {
        data: fallback.items.map((auction) => shapeAuction(auction, options)),
        pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: fallback.total })
      };
    }

    throw error;
  }
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

async function revealAuctionResult(auctionId, userId) {
  return withTransaction(async (client) => {
    const auction = await buildAuctionDetails(client, auctionId, userId, { includeAdminFields: true });

    if (!auction.participated) {
      throw new ApiError(403, 'Only participants can reveal this auction result');
    }

    if (!auction.revealEligible) {
      throw new ApiError(403, 'Result reveal is not available yet');
    }

    const reveal = await auctionRepository.upsertAuctionResultReveal(client, auctionId, userId);
    const refreshed = await buildAuctionDetails(client, auctionId, userId);

    return {
      ...refreshed,
      resultReveal: reveal,
      revealEligible: true
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
  BTCT_USD_PRICE,
  listAuctions,
  getAuctionDetails,
  getAuctionDetailsWithClient,
  revealAuctionResult,
  placeBid,
  listMyAuctionHistory,
  ensureAuctionResolved,
  sanitizeAuctionPayload,
  deriveAuctionStatus,
  validateAuctionRange
};








