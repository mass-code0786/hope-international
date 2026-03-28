const { withTransaction } = require('../../db/pool');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { ApiError } = require('../../utils/ApiError');
const adminRepository = require('../../repositories/adminRepository');
const auctionRepository = require('../../repositories/auctionRepository');
const auctionService = require('../auctionService');

async function listAuctions(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await withTransaction(async (client) => {
    const initial = await auctionRepository.listAuctions(client, {
      ...filters,
      onlyActive: false
    }, pagination);

    for (const auction of initial.items) {
      if (auction.computed_status === 'ended' && auction.status !== 'cancelled' && !auction.winner_user_id && !auction.closed_at) {
        await auctionService.ensureAuctionResolved(client, auction.id);
      }
    }

    return auctionRepository.listAuctions(client, {
      ...filters,
      onlyActive: false
    }, pagination);
  });

  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function getAuction(auctionId) {
  return auctionService.getAuctionDetails(auctionId);
}

async function createAuction(adminUserId, payload) {
  return withTransaction(async (client) => {
    const sanitized = auctionService.sanitizeAuctionPayload({
      ...payload,
      status: 'upcoming',
      currentBid: payload.startingPrice,
      isActive: payload.isActive ?? true
    });

    if (!sanitized.title) {
      throw new ApiError(400, 'Auction title is required');
    }

    const created = await auctionRepository.createAuction(client, {
      ...sanitized,
      createdBy: adminUserId,
      updatedBy: adminUserId
    });

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'auction.create',
      targetEntity: 'auction',
      targetId: created.id,
      beforeData: null,
      afterData: created,
      metadata: { title: created.title }
    });

    return auctionRepository.getAuctionById(client, created.id);
  });
}

async function updateAuction(adminUserId, auctionId, payload) {
  return withTransaction(async (client) => {
    const before = await auctionRepository.getAuctionForUpdate(client, auctionId);
    if (!before) throw new ApiError(404, 'Auction not found');

    const merged = auctionService.sanitizeAuctionPayload(payload, before);
    if (!merged.title) {
      throw new ApiError(400, 'Auction title is required');
    }

    const updated = await auctionRepository.updateAuction(client, auctionId, {
      ...merged,
      updatedBy: adminUserId
    });

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'auction.update',
      targetEntity: 'auction',
      targetId: auctionId,
      beforeData: before,
      afterData: updated,
      metadata: { title: updated.title }
    });

    return auctionRepository.getAuctionById(client, updated.id);
  });
}

async function changeAuctionState(adminUserId, auctionId, action, reason) {
  return withTransaction(async (client) => {
    const before = await auctionRepository.getAuctionForUpdate(client, auctionId);
    if (!before) throw new ApiError(404, 'Auction not found');

    let patch;
    if (action === 'close') {
      const highestBid = await auctionRepository.getHighestBid(client, auctionId);
      patch = {
        ...auctionService.sanitizeAuctionPayload({}, before),
        status: 'ended',
        isActive: false,
        closedAt: before.closed_at || new Date().toISOString(),
        closeReason: reason || 'Closed manually',
        winnerUserId: highestBid?.user_id || null,
        winningBidId: highestBid?.id || null,
        currentBid: highestBid?.amount || before.current_bid || before.starting_price,
        updatedBy: adminUserId
      };
    } else if (action === 'cancel') {
      patch = {
        ...auctionService.sanitizeAuctionPayload({}, before),
        status: 'cancelled',
        isActive: false,
        cancelledAt: before.cancelled_at || new Date().toISOString(),
        closeReason: reason || 'Cancelled manually',
        updatedBy: adminUserId
      };
    } else if (action === 'activate') {
      patch = {
        ...auctionService.sanitizeAuctionPayload({}, before),
        isActive: true,
        status: auctionService.deriveAuctionStatus({
          status: null,
          isActive: true,
          startAt: before.start_at,
          endAt: before.end_at,
          cancelledAt: null,
          closedAt: null
        }),
        cancelledAt: null,
        closedAt: null,
        closeReason: null,
        updatedBy: adminUserId
      };
    } else if (action === 'deactivate') {
      patch = {
        ...auctionService.sanitizeAuctionPayload({}, before),
        isActive: false,
        status: 'upcoming',
        updatedBy: adminUserId
      };
    } else {
      throw new ApiError(400, 'Unsupported auction action');
    }

    const updated = await auctionRepository.updateAuction(client, auctionId, patch);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: `auction.${action}`,
      targetEntity: 'auction',
      targetId: auctionId,
      beforeData: before,
      afterData: updated,
      metadata: { reason: reason || null }
    });

    return auctionRepository.getAuctionById(client, auctionId);
  });
}

module.exports = {
  listAuctions,
  getAuction,
  createAuction,
  updateAuction,
  changeAuctionState
};
