const { withTransaction } = require('../../db/pool');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { ApiError } = require('../../utils/ApiError');
const adminRepository = require('../../repositories/adminRepository');
const auctionRepository = require('../../repositories/auctionRepository');
const auctionService = require('../auctionService');

async function assertAuctionProduct(client, productId) {
  const product = await adminRepository.getProductById(client, productId);
  if (!product) {
    throw new ApiError(400, 'Selected product was not found');
  }
  return product;
}

async function listAuctions(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await withTransaction(async (client) => {
    const initial = await auctionRepository.listAuctions(client, {
      ...filters,
      onlyActive: false
    }, pagination);

    for (const auction of initial.items) {
      if (auction.computed_status === 'ended' && auction.status !== 'cancelled') {
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
  return auctionService.getAuctionDetails(auctionId, null, { includeAdminFields: true });
}

async function createAuction(adminUserId, payload) {
  return withTransaction(async (client) => {
    if (!payload.productId) {
      throw new ApiError(400, 'Product is required');
    }
    const product = await assertAuctionProduct(client, payload.productId);

    const sanitized = auctionService.sanitizeAuctionPayload({
      ...payload,
      status: 'upcoming',
      isActive: payload.isActive ?? true,
      totalEntries: 0,
      hasTie: false,
      winnerCount: 0
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
      metadata: { title: created.title, productId: product.id, productName: product.name, hiddenCapacity: created.hidden_capacity }
    });

    return auctionService.getAuctionDetails(created.id, null, { includeAdminFields: true });
  });
}

async function updateAuction(adminUserId, auctionId, payload) {
  return withTransaction(async (client) => {
    const before = await auctionRepository.getAuctionForUpdate(client, auctionId);
    if (!before) throw new ApiError(404, 'Auction not found');

    const nextProductId = payload.productId ?? before.product_id;
    if (!nextProductId) {
      throw new ApiError(400, 'Product is required');
    }
    const product = await assertAuctionProduct(client, nextProductId);

    const merged = auctionService.sanitizeAuctionPayload({
      ...payload,
      productId: nextProductId
    }, before);
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
      metadata: { title: updated.title, productId: product.id, productName: product.name }
    });

    return auctionService.getAuctionDetails(updated.id, null, { includeAdminFields: true });
  });
}

async function changeAuctionState(adminUserId, auctionId, action, reason) {
  return withTransaction(async (client) => {
    const before = await auctionRepository.getAuctionForUpdate(client, auctionId);
    if (!before) throw new ApiError(404, 'Auction not found');

    let patch;
    if (action === 'close') {
      patch = {
        ...auctionService.sanitizeAuctionPayload({}, before),
        status: 'ended',
        isActive: false,
        closedAt: before.closed_at || new Date().toISOString(),
        closeReason: reason || 'Closed manually',
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
          closedAt: null,
          totalEntries: before.total_entries,
          hiddenCapacity: before.hidden_capacity
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

    await auctionRepository.updateAuction(client, auctionId, patch);

    if (action === 'close') {
      await auctionService.ensureAuctionResolved(client, auctionId);
    }

    const updated = await auctionService.getAuctionDetails(auctionId, null, { includeAdminFields: true });

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: `auction.${action}`,
      targetEntity: 'auction',
      targetId: auctionId,
      beforeData: before,
      afterData: updated,
      metadata: { reason: reason || null }
    });

    return updated;
  });
}

module.exports = {
  listAuctions,
  getAuction,
  createAuction,
  updateAuction,
  changeAuctionState
};
