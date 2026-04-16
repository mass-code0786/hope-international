const { withTransaction } = require('../db/pool');
const { normalizePagination, buildPagination } = require('../utils/pagination');
const { ApiError } = require('../utils/ApiError');
const auctionRepository = require('../repositories/auctionRepository');
const walletRepository = require('../repositories/walletRepository');
const walletService = require('./walletService');
const notificationService = require('./notificationService');
const { withPerfSpan } = require('../utils/perf');

const MIN_AUCTION_PRICE = 0.10;
const MIN_REWARD_VALUE = 0.01;
const BTCT_USD_PRICE = 0.10;
const AUCTION_SCHEMA_ERROR_CODES = ['42P01', '42703', '42883', '42804'];
const AUCTION_WINNER_MODES = ['highest', 'middle', 'last'];
const AUCTION_TYPES = ['product', 'cash_amount'];
const AUCTION_REWARD_MODES = ['stock', 'split', 'cash'];
const AUCTION_PRIZE_DISTRIBUTION_TYPES = ['per_winner', 'shared_pool', 'rank_wise'];
const CASH_AUCTION_CREDIT_WALLET = 'withdrawal_wallet';

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

function normalizeWinnerModes(value, fallback = ['highest']) {
  const list = Array.isArray(value) ? value : fallback;
  const normalized = [];
  for (const mode of list) {
    const safeMode = String(mode || '').trim().toLowerCase();
    if (!AUCTION_WINNER_MODES.includes(safeMode)) continue;
    if (!normalized.includes(safeMode)) normalized.push(safeMode);
  }
  return normalized.length ? normalized : [...fallback];
}

function validateRewardValue(value) {
  const amount = roundMoney(value);
  if (Number.isNaN(amount) || amount < MIN_REWARD_VALUE) {
    throw new ApiError(400, 'Reward value must be greater than $0.00');
  }
  return amount;
}

function normalizeRewardMode(value, fallback = 'stock') {
  const normalized = String(value || fallback).trim().toLowerCase();
  return AUCTION_REWARD_MODES.includes(normalized) ? normalized : fallback;
}

function normalizeAuctionType(value, fallback = 'product') {
  const normalized = String(value || fallback).trim().toLowerCase();
  return AUCTION_TYPES.includes(normalized) ? normalized : fallback;
}

function normalizePrizeDistributionType(value, fallback = 'per_winner') {
  const normalized = String(value || fallback).trim().toLowerCase();
  return AUCTION_PRIZE_DISTRIBUTION_TYPES.includes(normalized) ? normalized : fallback;
}

function validatePositiveMoney(value, label) {
  const amount = roundMoney(value);
  if (Number.isNaN(amount) || amount <= 0) {
    throw new ApiError(400, `${label} must be greater than $0.00`);
  }
  return amount;
}

function validateCashAuctionConfig({ rewardMode, auctionType, cashPrize, prizeAmount, prizeDistributionType, eachWinnerAmount: existingEachWinnerAmount, winnerCount }) {
  const safeRewardMode = normalizeRewardMode(rewardMode, auctionType === 'cash_amount' ? 'cash' : 'stock');
  if (safeRewardMode !== 'cash') {
    return {
      cashPrize: null,
      rewardMode: safeRewardMode,
      auctionType: 'product',
      prizeAmount: null,
      prizeDistributionType: 'per_winner',
      eachWinnerAmount: null
    };
  }

  const safePrizeAmount = validatePositiveMoney(cashPrize ?? existingEachWinnerAmount ?? prizeAmount, 'Cash prize');
  const safeWinnerCount = Number(winnerCount || 0);
  if (!Number.isInteger(safeWinnerCount) || safeWinnerCount <= 0) {
    throw new ApiError(400, 'Winner count must be a positive whole number');
  }

  const safeDistributionType = normalizePrizeDistributionType(prizeDistributionType, 'per_winner');
  if (safeDistributionType === 'rank_wise') {
    return {
      cashPrize: safePrizeAmount,
      rewardMode: 'cash',
      auctionType: 'cash_amount',
      prizeAmount: safePrizeAmount,
      prizeDistributionType: safeDistributionType,
      eachWinnerAmount: null
    };
  }

  if (safeDistributionType === 'shared_pool') {
    const cents = Math.round(safePrizeAmount * 100);
    if (cents % safeWinnerCount !== 0) {
      throw new ApiError(400, 'Shared pool amount must divide evenly across winners to the cent');
    }
  }

  const eachWinnerAmount = safeDistributionType === 'shared_pool'
    ? roundMoney(safePrizeAmount / safeWinnerCount)
    : safePrizeAmount;

  return {
    cashPrize: safePrizeAmount,
    rewardMode: 'cash',
    auctionType: 'cash_amount',
    prizeAmount: safePrizeAmount,
    prizeDistributionType: safeDistributionType,
    eachWinnerAmount
  };
}

function normalizeRankPrizeEntries(value) {
  const entries = Array.isArray(value) ? value : [];
  return entries
    .map((entry, index) => ({
      winnerRank: Number(entry?.winnerRank ?? entry?.winner_rank ?? index + 1),
      prizeAmount: roundMoney(entry?.prizeAmount ?? entry?.prize_amount ?? 0)
    }))
    .filter((entry) => Number.isInteger(entry.winnerRank) && entry.winnerRank > 0 && !Number.isNaN(entry.prizeAmount));
}

function validateRankPrizeEntries(rankPrizes, winnerCount) {
  const safeWinnerCount = Number(winnerCount || 0);
  const normalized = normalizeRankPrizeEntries(rankPrizes)
    .sort((left, right) => left.winnerRank - right.winnerRank);

  if (normalized.length !== safeWinnerCount) {
    throw new ApiError(400, 'Rank prize rows must match the configured winner count');
  }

  const expectedRanks = new Set(Array.from({ length: safeWinnerCount }, (_, index) => index + 1));
  let positiveCount = 0;
  for (const entry of normalized) {
    if (!expectedRanks.has(entry.winnerRank)) {
      throw new ApiError(400, 'Rank prize rows must cover each winner rank exactly once');
    }
    expectedRanks.delete(entry.winnerRank);
    if (entry.prizeAmount < 0) {
      throw new ApiError(400, 'Rank prize amounts must be zero or greater');
    }
    if (entry.prizeAmount > 0) positiveCount += 1;
  }

  if (expectedRanks.size > 0) {
    throw new ApiError(400, 'Rank prize rows must cover each winner rank exactly once');
  }

  if (positiveCount <= 0) {
    throw new ApiError(400, 'At least one rank prize amount must be greater than zero');
  }

  return normalized;
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

  const rewardMode = normalizeRewardMode(
    payload.rewardMode
      ?? before?.reward_mode
      ?? (payload.auctionType === 'cash_amount' || before?.auction_type === 'cash_amount' ? 'cash' : 'stock')
  );
  if (!AUCTION_REWARD_MODES.includes(rewardMode)) {
    throw new ApiError(400, 'Reward mode must be stock, split, or cash');
  }

  const rewardValueRaw = payload.rewardValue ?? before?.reward_value;
  const rewardValue = rewardMode === 'split'
    ? validateRewardValue(rewardValueRaw)
    : null;

  const isActive = payload.isActive ?? before?.is_active ?? true;
  const cancelledAt = payload.cancelledAt ?? before?.cancelled_at ?? null;
  const closedAt = payload.closedAt ?? before?.closed_at ?? null;
  const totalEntries = Number(payload.totalEntries ?? before?.total_entries ?? 0);
  const winnerCount = Number(payload.winnerCount ?? before?.winner_count ?? 1);
  const winnerModes = normalizeWinnerModes(payload.winnerModes ?? before?.winner_modes ?? ['highest']);
  const auctionType = normalizeAuctionType(
    rewardMode === 'cash'
      ? 'cash_amount'
      : (payload.auctionType ?? before?.auction_type ?? 'product')
  );
  const winnerCountValue = Number.isInteger(winnerCount) && winnerCount > 0 ? winnerCount : 1;
  const cashConfig = validateCashAuctionConfig({
    rewardMode,
    auctionType,
    cashPrize: payload.cashPrize ?? before?.cash_prize ?? null,
    prizeAmount: payload.prizeAmount ?? before?.prize_amount ?? null,
    prizeDistributionType: payload.prizeDistributionType ?? before?.prize_distribution_type ?? 'per_winner',
    eachWinnerAmount: payload.eachWinnerAmount ?? before?.each_winner_amount ?? null,
    winnerCount: winnerCountValue
  });
  const rankPrizes = cashConfig.auctionType === 'cash_amount' && cashConfig.prizeDistributionType === 'rank_wise'
    ? validateRankPrizeEntries(payload.rankPrizes ?? before?.rank_prizes ?? [], winnerCountValue)
    : [];
  const effectivePrizeAmount = cashConfig.auctionType === 'cash_amount' && cashConfig.prizeDistributionType === 'rank_wise'
    ? roundMoney(rankPrizes.reduce((sum, entry) => sum + Number(entry.prizeAmount || 0), 0))
    : cashConfig.prizeAmount;

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
    auctionType: cashConfig.auctionType,
    cashPrize: cashConfig.cashPrize,
    prizeAmount: effectivePrizeAmount,
    prizeDistributionType: cashConfig.prizeDistributionType,
    eachWinnerAmount: cashConfig.eachWinnerAmount,
    rewardMode,
    rewardValue,
    totalEntries,
    hasTie: Boolean(payload.hasTie ?? before?.has_tie ?? false),
    winnerCount: winnerCountValue,
    winnerModes,
    rankPrizes,
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

function buildBidSequenceEntries(bids = []) {
  const ordered = [...bids].sort((left, right) => {
    const byCreatedAt = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    if (byCreatedAt !== 0) return byCreatedAt;
    return String(left.id || '').localeCompare(String(right.id || ''));
  });

  const entries = [];
  let position = 0;
  for (const bid of ordered) {
    const entryCount = Math.max(0, Number(bid.entry_count || 0));
    for (let index = 0; index < entryCount; index += 1) {
      position += 1;
      entries.push({
        position,
        bidId: bid.id,
        userId: bid.user_id,
        username: bid.username,
        createdAt: bid.created_at,
        entryOffset: index + 1
      });
    }
  }

  return entries;
}

function buildHighestCandidatePool(participants = [], bids = []) {
  const finalBidMoments = new Map();
  for (const bid of bids) {
    finalBidMoments.set(String(bid.user_id), bid.created_at);
  }

  return [...participants]
    .sort((left, right) => {
      const byEntries = Number(right.total_entries || 0) - Number(left.total_entries || 0);
      if (byEntries !== 0) return byEntries;
      const leftFinal = new Date(finalBidMoments.get(String(left.user_id)) || left.last_bid_at || 0).getTime();
      const rightFinal = new Date(finalBidMoments.get(String(right.user_id)) || right.last_bid_at || 0).getTime();
      if (leftFinal !== rightFinal) return leftFinal - rightFinal;
      const leftJoin = new Date(left.joined_at || 0).getTime();
      const rightJoin = new Date(right.joined_at || 0).getTime();
      if (leftJoin !== rightJoin) return leftJoin - rightJoin;
      return String(left.user_id).localeCompare(String(right.user_id));
    })
    .map((participant, index) => ({
      userId: participant.user_id,
      username: participant.username,
      winnerMode: 'highest',
      modeRank: index + 1,
      sequencePosition: null,
      totalEntriesSnapshot: Number(participant.total_entries || 0),
      totalBidsSnapshot: Number(participant.total_bids || 0),
      winningEntryCount: Number(participant.total_entries || 0),
      selectionMetadata: {
        tieBreak: 'earliest_final_qualifying_entry_then_earliest_join',
        finalBidAt: finalBidMoments.get(String(participant.user_id)) || participant.last_bid_at || null
      }
    }));
}

function buildMiddlePositionOrder(totalPositions) {
  if (totalPositions <= 0) return [];
  const leftCenter = Math.floor((totalPositions + 1) / 2);
  const rightCenter = Math.ceil((totalPositions + 1) / 2);
  const ordered = [];
  const seen = new Set();

  for (let offset = 0; ordered.length < totalPositions; offset += 1) {
    const left = leftCenter - offset;
    const right = rightCenter + offset;
    if (left >= 1 && left <= totalPositions && !seen.has(left)) {
      ordered.push(left);
      seen.add(left);
    }
    if (right >= 1 && right <= totalPositions && !seen.has(right)) {
      ordered.push(right);
      seen.add(right);
    }
  }

  return ordered;
}

function buildSequenceCandidatePool(sequenceEntries = [], participantsByUserId = new Map(), mode) {
  const orderedEntries = mode === 'last'
    ? [...sequenceEntries].sort((left, right) => right.position - left.position)
    : buildMiddlePositionOrder(sequenceEntries.length)
      .map((position) => sequenceEntries[position - 1])
      .filter(Boolean);

  return orderedEntries.map((entry, index) => {
    const participant = participantsByUserId.get(String(entry.userId)) || {};
    return {
      userId: entry.userId,
      username: entry.username,
      winnerMode: mode,
      modeRank: index + 1,
      sequencePosition: entry.position,
      totalEntriesSnapshot: Number(participant.total_entries || 0),
      totalBidsSnapshot: Number(participant.total_bids || 0),
      winningEntryCount: Number(participant.total_entries || 0),
      selectionMetadata: {
        bidId: entry.bidId,
        entryOffset: entry.entryOffset,
        createdAt: entry.createdAt
      }
    };
  });
}

function buildWinnerAllocations(auction, participants, bids) {
  if (!participants.length) return [];

  const desiredWinnerCount = Math.max(1, Number(auction.winner_count || 1));
  const winnerModes = normalizeWinnerModes(auction.winner_modes, ['highest']);
  const participantsByUserId = new Map(participants.map((participant) => [String(participant.user_id), participant]));
  const sequenceEntries = buildBidSequenceEntries(bids);
  const candidatePools = {
    highest: buildHighestCandidatePool(participants, bids),
    middle: buildSequenceCandidatePool(sequenceEntries, participantsByUserId, 'middle'),
    last: buildSequenceCandidatePool(sequenceEntries, participantsByUserId, 'last')
  };

  const selected = [];
  const selectedUserIds = new Set();
  const poolIndexes = Object.fromEntries(winnerModes.map((mode) => [mode, 0]));

  while (selected.length < desiredWinnerCount) {
    let addedInRound = false;
    for (const mode of winnerModes) {
      const pool = candidatePools[mode] || [];
      let pointer = poolIndexes[mode] || 0;
      while (pointer < pool.length && selectedUserIds.has(String(pool[pointer].userId))) {
        pointer += 1;
      }
      poolIndexes[mode] = pointer;
      if (pointer >= pool.length) continue;
      const winner = pool[pointer];
      poolIndexes[mode] = pointer + 1;
      selected.push(winner);
      selectedUserIds.add(String(winner.userId));
      addedInRound = true;
      if (selected.length >= desiredWinnerCount) break;
    }
    if (!addedInRound) break;
  }

  if (!selected.length) return [];

  const actualWinnerCount = selected.length;
  const allocationRatio = Number((1 / actualWinnerCount).toFixed(6));
  const stockQuantity = Number(auction.stock_quantity || 1);
  const rewardValue = Number(auction.reward_value || 0);
  const normalizedRewardMode = normalizeRewardMode(
    auction.reward_mode,
    normalizeAuctionType(auction.auction_type, 'product') === 'cash_amount' ? 'cash' : 'stock'
  );
  const isCashAuction = normalizedRewardMode === 'cash';
  const cashPrize = isCashAuction ? roundMoney(auction.cash_prize || auction.each_winner_amount || auction.prize_amount || 0) : null;
  const rankPrizeMap = new Map(
    normalizeRankPrizeEntries(auction.rank_prizes || []).map((entry) => [entry.winnerRank, entry.prizeAmount])
  );
  const allocationQuantity = normalizedRewardMode === 'split'
    ? Number((rewardValue / actualWinnerCount).toFixed(2))
    : normalizedRewardMode === 'cash'
      ? null
      : Number((stockQuantity / actualWinnerCount).toFixed(2));

  return selected.map((winner, index) => {
    const selectionRank = index + 1;
    const prizeAmount = isCashAuction
      ? (
        normalizePrizeDistributionType(auction.prize_distribution_type, 'per_winner') === 'rank_wise'
          ? roundMoney(rankPrizeMap.get(selectionRank) || 0)
          : cashPrize
      )
      : null;

    return {
      userId: winner.userId,
      winningEntryCount: winner.winningEntryCount,
      allocationRatio,
      allocationQuantity,
      prizeType: isCashAuction ? 'cash_amount' : 'product',
      prizeAmount,
      creditedWalletType: isCashAuction ? CASH_AUCTION_CREDIT_WALLET : null,
      rewardMode: auction.reward_mode || 'stock',
      winnerMode: winner.winnerMode,
      selectionRank,
      sequencePosition: winner.sequencePosition,
      totalBidsSnapshot: winner.totalBidsSnapshot,
      totalEntriesSnapshot: winner.totalEntriesSnapshot,
      selectionMetadata: {
        ...winner.selectionMetadata,
        modeRank: winner.modeRank,
        configuredWinnerCount: desiredWinnerCount,
        configuredWinnerModes: winnerModes,
        prizeType: isCashAuction ? 'cash_amount' : 'product',
        prizeAmount,
        creditedWalletType: isCashAuction ? CASH_AUCTION_CREDIT_WALLET : null
      }
    };
  });
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
    cash_awarded: roundMoney(distribution.cash_awarded || 0),
    wallet_transaction_id: distribution.wallet_transaction_id || null,
    credited_wallet_type: distribution.credited_wallet_type || null,
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
  const winnersByUserId = new Map(winners.map((winner) => [String(winner.userId), winner]));
  const isCashAuction = normalizeRewardMode(
    auction.reward_mode,
    normalizeAuctionType(auction.auction_type, 'product') === 'cash_amount' ? 'cash' : 'stock'
  ) === 'cash';
  const distributions = [];

  for (const participant of leaderboard) {
    const amountSpent = roundMoney(participant.total_spent || 0);
    const isWinner = winnerIds.has(String(participant.user_id));
    const winnerRecord = winnersByUserId.get(String(participant.user_id)) || null;
    const btctAwarded = isWinner ? 0 : roundBtct(amountSpent / BTCT_USD_PRICE);
    const existing = await auctionRepository.getAuctionRewardDistribution(client, auction.id, participant.user_id);

    let btctTransactionId = existing?.btct_transaction_id || null;
    let walletTransactionId = existing?.wallet_transaction_id || null;
    let creditedWalletType = existing?.credited_wallet_type || (isWinner && isCashAuction ? CASH_AUCTION_CREDIT_WALLET : null);
    let cashAwarded = isWinner && isCashAuction
      ? roundMoney(winnerRecord?.prizeAmount || auction.cash_prize || auction.each_winner_amount || auction.prize_amount || 0)
      : 0;
    let distributedAt = existing?.distributed_at || new Date().toISOString();

    if (isWinner && isCashAuction && cashAwarded > 0) {
      if (!walletTransactionId) {
        const existingWalletTransaction = await walletRepository.getTransactionBySourceAndReference(
          client,
          participant.user_id,
          'auction_win_cash',
          auction.id
        );

        if (existingWalletTransaction) {
          walletTransactionId = existingWalletTransaction.id;
          distributedAt = existingWalletTransaction.created_at || distributedAt;
        } else {
          const reward = await walletService.creditWithTransaction(client, participant.user_id, cashAwarded, 'auction_win_cash', auction.id, {
            walletType: CASH_AUCTION_CREDIT_WALLET,
            auctionId: auction.id,
            auctionTitle: auction.title,
            prizeType: 'cash_amount',
            prizeAmount: cashAwarded,
            winnerMode: winnerRecord?.winnerMode || null,
            selectionRank: winnerRecord?.selectionRank || null,
            configuredWinnerCount: Number(auction.winner_count || winners.length || 1)
          });
          walletTransactionId = reward.transaction.id;
          distributedAt = reward.transaction.created_at || distributedAt;
        }
      }

      await auctionRepository.updateAuctionWinnerCredit(client, auction.id, participant.user_id, {
        creditedWalletType,
        creditedAt: distributedAt,
        walletTransactionId
      });
    }

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
      cashAwarded,
      btctTransactionId,
      walletTransactionId,
      creditedWalletType,
      distributedAt,
      metadata: {
        btctPrice: BTCT_USD_PRICE,
        auctionTitle: auction.title,
        isWinner,
        winnerCount: winners.length,
        winnerModes: winnerRecord ? [winnerRecord.winnerMode] : [],
        selectionRank: winnerRecord?.selectionRank || null,
        prizeType: winnerRecord?.prizeType || normalizeAuctionType(auction.auction_type, 'product'),
        prizeAmount: cashAwarded || null,
        creditedWalletType: creditedWalletType || null
      }
    });

    distributions.push(distribution);

    const notificationPayload = notificationService.buildAuctionResultNotification({
      ...distribution,
      auction_title: auction.title
    });
    if (notificationPayload) {
      await notificationService.createNotificationOnce(client, notificationPayload);
    }
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

function shapeAuctionListItem(auction) {
  if (!auction) return auction;
  const capacity = buildCapacitySummary(auction);
  return {
    id: auction.id,
    product_id: auction.product_id || null,
    title: auction.title,
    short_description: auction.short_description || '',
    category: auction.category || null,
    image_url: auction.image_url || null,
    product_image_url: auction.product_image_url || null,
    status: auction.status,
    computed_status: auction.computed_status,
    start_at: auction.start_at,
    end_at: auction.end_at,
    created_at: auction.created_at,
    updated_at: auction.updated_at,
    entry_price: roundMoney(auction.entry_price || auction.display_current_bid || 0),
    display_current_bid: roundMoney(auction.display_current_bid || auction.entry_price || 0),
    total_entries: Number(auction.total_entries || 0),
    total_bids: Number(auction.total_bids || 0),
    winner_count: Number(auction.winner_count || 1),
    totalCapacity: capacity.totalCapacity,
    capacityFilled: capacity.filledEntries,
    capacityRemaining: capacity.remainingEntries,
    capacityPercent: capacity.percentFilled
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
        winner_mode: winner.winner_mode || 'highest',
        selection_rank: Number(winner.selection_rank || 0),
        sequence_position: winner.sequence_position === null || winner.sequence_position === undefined ? null : Number(winner.sequence_position),
        total_bids_snapshot: Number(winner.total_bids_snapshot || 0),
        total_entries_snapshot: Number(winner.total_entries_snapshot || 0),
        allocation_ratio: winner.allocation_ratio,
        allocation_quantity: winner.allocation_quantity,
        prize_type: winner.prize_type || 'product',
        prize_amount: winner.prize_amount === null || winner.prize_amount === undefined ? null : roundMoney(winner.prize_amount),
        reward_mode: winner.reward_mode,
        credited_wallet_type: winner.credited_wallet_type || null,
        credited_at: winner.credited_at || null,
        wallet_transaction_id: winner.wallet_transaction_id || null,
        selection_metadata: winner.selection_metadata || {},
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

  const [participants, bids] = await Promise.all([
    auctionRepository.listAuctionLeaderboard(client, auctionId, null),
    auctionRepository.listAuctionBidsAsc(client, auctionId)
  ]);
  const winners = buildWinnerAllocations(auction, participants, bids);
  await auctionRepository.replaceAuctionWinners(client, auctionId, winners);

  const winningBid = winners[0]?.selectionMetadata?.bidId
    ? { id: winners[0].selectionMetadata.bidId }
    : await auctionRepository.getHighestBid(client, auctionId);
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
    actualWinnerCount: winners.length,
    participated: Boolean(currentParticipant),
    resultFinalized,
    revealEligible,
    resultReveal,
    winnerUsernames: winners.map((winner) => winner.username).filter(Boolean)
  }, options);
}

async function listAuctions(_userId, filters = {}, paginationInput = {}, options = {}) {
  const pagination = normalizePagination({ ...paginationInput, limit: paginationInput.limit || 10, maxLimit: 20 });

  return withPerfSpan('auctions.list', async () => {
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
        data: result.items.map(shapeAuctionListItem),
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
          data: fallback.items.map(shapeAuctionListItem),
          pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: fallback.total })
        };
      }

      throw error;
    }
  }, {
    thresholdMs: 150,
    meta: { status: filters.status || 'all', search: Boolean(filters.search), page: pagination.page, limit: pagination.limit }
  });
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

    await walletService.debitForAuctionEntry(client, userId, totalAmount, 'auction_entry', auctionId, {
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
  const safeKind = filters?.kind || 'bids';
  const result = await withTransaction(async (client) => {
    console.log('[auction.history.request]', {
      userId,
      kind: safeKind,
      page: pagination.page,
      limit: pagination.limit
    });

    let history;
    try {
      history = await auctionRepository.listUserAuctionHistory(client, userId, filters, pagination);
      console.log('[auction.history.list.initial.success]', {
        userId,
        kind: safeKind,
        count: Array.isArray(history?.items) ? history.items.length : 0,
        total: Number(history?.total || 0)
      });
    } catch (error) {
      console.error('[auction.history.list.initial.error]', {
        userId,
        kind: safeKind,
        page: pagination.page,
        limit: pagination.limit,
        code: error?.code || null,
        message: error?.message || 'Unknown auction history list failure',
        stack: error?.stack || null
      });
      throw error;
    }

    for (const auction of history.items) {
      if (auction.computed_status === 'ended' && auction.status !== 'cancelled') {
        try {
          await ensureAuctionResolved(client, auction.id);
        } catch (error) {
          if (isAuctionSchemaError(error)) {
            console.warn('[auction.history.ensure.resolve.skipped]', {
              auctionId: auction.id,
              userId,
              code: error?.code || null,
              message: error?.message || 'Unknown auction history resolve failure'
            });
            continue;
          }
          throw error;
        }
      }
    }

    let refreshed;
    try {
      refreshed = await auctionRepository.listUserAuctionHistory(client, userId, filters, pagination);
      console.log('[auction.history.list.refreshed.success]', {
        userId,
        kind: safeKind,
        count: Array.isArray(refreshed?.items) ? refreshed.items.length : 0,
        total: Number(refreshed?.total || 0)
      });
    } catch (error) {
      console.error('[auction.history.list.refreshed.error]', {
        userId,
        kind: safeKind,
        page: pagination.page,
        limit: pagination.limit,
        code: error?.code || null,
        message: error?.message || 'Unknown refreshed auction history failure',
        stack: error?.stack || null
      });
      throw error;
    }

    let summary;
    try {
      summary = await auctionRepository.getUserBidStats(client, userId);
      console.log('[auction.history.summary.success]', {
        userId,
        kind: safeKind,
        summary
      });
    } catch (error) {
      console.error('[auction.history.summary.error]', {
        userId,
        kind: safeKind,
        code: error?.code || null,
        message: error?.message || 'Unknown auction history summary failure',
        stack: error?.stack || null
      });
      throw error;
    }

    return { history: refreshed, summary };
  });

  return {
    data: result.history.items.map((auction) => shapeAuction(auction)),
    summary: result.summary || {
      my_bids: 0,
      auctions_joined: 0,
      won_auctions: 0,
      auction_history: 0
    },
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









