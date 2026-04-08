const { withTransaction } = require('../../db/pool');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { ApiError } = require('../../utils/ApiError');
const adminRepository = require('../../repositories/adminRepository');
const auctionRepository = require('../../repositories/auctionRepository');
const auctionService = require('../auctionService');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUCTION_SCHEMA_ERROR_CODES = ['42P01', '42703', '42883', '42804'];

function isAuctionSchemaError(error) {
  return AUCTION_SCHEMA_ERROR_CODES.includes(error?.code);
}

function normalizeProductId(productId) {
  const normalized = String(productId || '').trim();
  if (!UUID_PATTERN.test(normalized)) {
    throw new ApiError(400, 'Product id must be a valid UUID');
  }
  return normalized;
}

function normalizeSourceMode(mode, fallback = 'existing') {
  return mode === 'standalone' ? 'standalone' : fallback;
}

function toShortDescription(value) {
  return String(value || '').trim().slice(0, 400);
}

async function safeAdminAuditLog(client, payload) {
  try {
    await adminRepository.logAdminAction(client, payload);
  } catch (error) {
    if (isAuctionSchemaError(error)) {
      console.error('[admin.auctions.audit] schema mismatch', {
        code: error.code,
        message: error.message,
        actionType: payload.actionType,
        targetEntity: payload.targetEntity,
        targetId: payload.targetId || null
      });
      return;
    }
    throw error;
  }
}

async function assertAuctionProduct(client, productId) {
  const normalizedProductId = normalizeProductId(productId);
  const product = await adminRepository.getProductById(client, normalizedProductId);
  if (!product) {
    throw new ApiError(400, 'Selected product was not found');
  }
  return product;
}

function resolveAuctionSourceMode(payload, before = null) {
  if (payload?.sourceMode) return normalizeSourceMode(payload.sourceMode);
  if (payload?.productId) return 'existing';
  if (before?.product_id) return 'existing';
  return 'standalone';
}

function requireStandaloneField(value, message) {
  if (String(value || '').trim()) return;
  throw new ApiError(400, message);
}

async function buildAuctionSourcePayload(client, payload, before = null) {
  const sourceMode = resolveAuctionSourceMode(payload, before);

  if (sourceMode === 'existing') {
    const productId = payload.productId ?? before?.product_id;
    const product = await assertAuctionProduct(client, productId);
    const productGallery = Array.isArray(product.gallery) ? product.gallery : [];
    const fallbackImage = product.image_url || productGallery[0] || '';

    return {
      sourceMode,
      product,
      productId: product.id,
      title: String(payload.title ?? before?.title ?? product.name ?? '').trim(),
      shortDescription: toShortDescription(payload.shortDescription ?? before?.short_description ?? product.description ?? ''),
      description: String(payload.description ?? before?.description ?? product.description ?? '').trim(),
      imageUrl: String(payload.imageUrl ?? before?.image_url ?? fallbackImage).trim(),
      gallery: Array.isArray(payload.gallery)
        ? payload.gallery
        : Array.isArray(before?.gallery) && before.gallery.length
          ? before.gallery
          : productGallery,
      specifications: payload.specifications ?? before?.specifications ?? [],
      category: String(payload.category ?? before?.category ?? product.category ?? '').trim(),
      itemCondition: String(payload.itemCondition ?? before?.item_condition ?? '').trim(),
      shippingDetails: String(payload.shippingDetails ?? before?.shipping_details ?? '').trim()
    };
  }

  const standalone = {
    sourceMode,
    product: null,
    productId: null,
    title: String(payload.title ?? before?.title ?? '').trim(),
    shortDescription: toShortDescription(payload.shortDescription ?? before?.short_description ?? ''),
    description: String(payload.description ?? before?.description ?? '').trim(),
    imageUrl: String(payload.imageUrl ?? before?.image_url ?? '').trim(),
    gallery: Array.isArray(payload.gallery) ? payload.gallery : (before?.gallery || []),
    specifications: payload.specifications ?? before?.specifications ?? [],
    category: String(payload.category ?? before?.category ?? '').trim(),
    itemCondition: String(payload.itemCondition ?? before?.item_condition ?? '').trim(),
    shippingDetails: String(payload.shippingDetails ?? before?.shipping_details ?? '').trim()
  };

  requireStandaloneField(standalone.title, 'Auction title is required for auction-only items');
  requireStandaloneField(standalone.shortDescription, 'Short description is required for auction-only items');
  requireStandaloneField(standalone.imageUrl, 'Primary image is required for auction-only items');
  requireStandaloneField(standalone.category, 'Category is required for auction-only items');

  return standalone;
}

async function safeAuctionDetails(client, auctionId, fallbackAuction = null) {
  try {
    return await auctionService.getAuctionDetailsWithClient(client, auctionId, null, { includeAdminFields: true });
  } catch (error) {
    if (isAuctionSchemaError(error)) {
      console.error('[admin.auctions.details] schema mismatch', {
        code: error.code,
        message: error.message,
        auctionId
      });
      return fallbackAuction || null;
    }
    throw error;
  }
}

async function listAuctions(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);

  try {
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
      items: Array.isArray(result.items) ? result.items : [],
      total: Number(result.total || 0),
      page: pagination.page,
      limit: pagination.limit,
      pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
    };
  } catch (error) {
    console.error('[admin.auctions.list] failed', {
      code: error?.code || null,
      message: error?.message || 'Unknown admin auctions list failure',
      filters,
      pagination,
      stack: error?.stack || null
    });

    if (isAuctionSchemaError(error)) {
      try {
        const fallback = await withTransaction((client) => auctionRepository.listAuctionsCompat(client, {
          ...filters,
          onlyActive: false
        }, pagination));
        return {
          items: Array.isArray(fallback.items) ? fallback.items : [],
          total: Number(fallback.total || 0),
          page: pagination.page,
          limit: pagination.limit,
          pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: fallback.total })
        };
      } catch (fallbackError) {
        console.error('[admin.auctions.list] compat fallback failed', {
          code: fallbackError?.code || null,
          message: fallbackError?.message || 'Unknown compat auctions list failure',
          filters,
          pagination,
          stack: fallbackError?.stack || null
        });
        return {
          items: [],
          total: 0,
          page: pagination.page,
          limit: pagination.limit,
          pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: 0 })
        };
      }
    }

    throw error;
  }
}

async function getAuction(auctionId) {
  return withTransaction((client) => safeAuctionDetails(client, auctionId));
}

async function createAuction(adminUserId, payload) {
  return withTransaction(async (client) => {
    const source = await buildAuctionSourcePayload(client, payload);

    const sanitized = auctionService.sanitizeAuctionPayload({
      ...payload,
      productId: source.productId,
      title: source.title,
      shortDescription: source.shortDescription,
      description: source.description,
      imageUrl: source.imageUrl,
      gallery: source.gallery,
      specifications: source.specifications,
      category: source.category,
      itemCondition: source.itemCondition,
      shippingDetails: source.shippingDetails,
      status: 'upcoming',
      isActive: payload.isActive ?? true,
      totalEntries: 0,
      hasTie: false,
      winnerCount: payload.winnerCount,
      winnerModes: payload.winnerModes
    });

    if (!sanitized.title) {
      throw new ApiError(400, 'Auction title is required');
    }

    const created = await auctionRepository.createAuction(client, {
      ...sanitized,
      productId: source.productId,
      createdBy: adminUserId,
      updatedBy: adminUserId
    });

    await auctionRepository.replaceAuctionRankPrizes(client, created.id, sanitized.rankPrizes || []);

    await safeAdminAuditLog(client, {
      adminUserId,
      actionType: 'auction.create',
      targetEntity: 'auction',
      targetId: created.id,
      beforeData: null,
      afterData: created,
      metadata: {
        title: created.title,
        productId: source.product?.id || null,
        productName: source.product?.name || null,
        sourceMode: source.sourceMode,
        hiddenCapacity: created.hidden_capacity
      }
    });

    return safeAuctionDetails(client, created.id, created);
  });
}

async function updateAuction(adminUserId, auctionId, payload) {
  return withTransaction(async (client) => {
    const before = await auctionRepository.getAuctionForUpdate(client, auctionId);
    if (!before) throw new ApiError(404, 'Auction not found');

    const source = await buildAuctionSourcePayload(client, payload, before);
    const merged = auctionService.sanitizeAuctionPayload({
      ...payload,
      productId: source.productId,
      title: payload.title ?? source.title,
      shortDescription: payload.shortDescription ?? source.shortDescription,
      description: payload.description ?? source.description,
      imageUrl: payload.imageUrl ?? source.imageUrl,
      gallery: payload.gallery ?? source.gallery,
      specifications: payload.specifications ?? source.specifications,
      category: payload.category ?? source.category,
      itemCondition: payload.itemCondition ?? source.itemCondition,
      shippingDetails: payload.shippingDetails ?? source.shippingDetails,
      winnerCount: payload.winnerCount ?? before.winner_count,
      winnerModes: payload.winnerModes ?? before.winner_modes
    }, before);

    if (!merged.title) {
      throw new ApiError(400, 'Auction title is required');
    }

    const updated = await auctionRepository.updateAuction(client, auctionId, {
      ...merged,
      productId: source.productId,
      updatedBy: adminUserId
    });

    await auctionRepository.replaceAuctionRankPrizes(client, auctionId, merged.rankPrizes || []);

    await safeAdminAuditLog(client, {
      adminUserId,
      actionType: 'auction.update',
      targetEntity: 'auction',
      targetId: auctionId,
      beforeData: before,
      afterData: updated,
      metadata: {
        title: updated.title,
        productId: source.product?.id || null,
        productName: source.product?.name || null,
        sourceMode: source.sourceMode
      }
    });

    return safeAuctionDetails(client, updated.id, updated);
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

    const updated = await safeAuctionDetails(client, auctionId);

    await safeAdminAuditLog(client, {
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
