const { withTransaction } = require('../../db/pool');
const { ApiError } = require('../../utils/ApiError');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { PV_TO_BV_RATIO } = require('../../config/constants');
const adminRepository = require('../../repositories/adminRepository');
const sellerRepository = require('../../repositories/sellerRepository');

function toMoney(value) {
  return Number(Number(value).toFixed(2));
}

function isSchemaError(error) {
  return ['42P01', '42703'].includes(error?.code);
}

async function safeAdminAuditLog(client, payload) {
  try {
    await adminRepository.logAdminAction(client, payload);
  } catch (error) {
    if (isSchemaError(error)) {
      console.error('[admin.products.audit] schema mismatch', {
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

async function listProducts(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await adminRepository.listProducts(null, filters, pagination);
  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function getProduct(productId) {
  const product = await adminRepository.getProductById(null, productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }
  return product;
}

async function createProduct(adminUserId, payload) {
  return withTransaction(async (client) => {
    const bv = Number(payload.bv);
    const pv = toMoney(bv * PV_TO_BV_RATIO);

    const created = await adminRepository.createProduct(client, {
      ...payload,
      bv,
      pv
    });

    await safeAdminAuditLog(client, {
      adminUserId,
      actionType: 'product.create',
      targetEntity: 'product',
      targetId: created.id,
      beforeData: null,
      afterData: created,
      metadata: { sku: created.sku }
    });

    return created;
  });
}

async function updateProduct(adminUserId, productId, payload) {
  return withTransaction(async (client) => {
    const before = await adminRepository.getProductById(client, productId);
    if (!before) {
      throw new ApiError(404, 'Product not found');
    }

    const merged = {
      sku: payload.sku ?? before.sku,
      name: payload.name ?? before.name,
      description: payload.description ?? before.description,
      category: payload.category ?? before.category,
      price: payload.price ?? before.price,
      bv: payload.bv ?? before.bv,
      isActive: payload.isActive ?? before.is_active,
      isQualifying: payload.isQualifying ?? before.is_qualifying,
      imageUrl: payload.imageUrl ?? before.image_url,
      gallery: payload.gallery ?? before.gallery,
      moderationStatus: payload.moderationStatus ?? before.moderation_status,
      moderationNotes: payload.moderationNotes ?? before.moderation_notes
    };

    const bv = Number(merged.bv);
    const pv = toMoney(bv * PV_TO_BV_RATIO);

    if (before.seller_profile_id) {
      if (merged.moderationStatus === 'approved' && payload.isActive === undefined) {
        merged.isActive = true;
      }
      if (['pending', 'rejected'].includes(merged.moderationStatus)) {
        merged.isActive = false;
      }
    }

    const statusChanged = before.moderation_status !== merged.moderationStatus;

    const updated = await adminRepository.updateProduct(client, productId, {
      ...merged,
      bv,
      pv,
      moderatedBy: statusChanged ? adminUserId : before.moderated_by,
      moderatedAt: statusChanged ? new Date().toISOString() : before.moderated_at
    });

    if (statusChanged && before.seller_profile_id) {
      await sellerRepository.createProductModerationLog(client, {
        productId,
        sellerProfileId: before.seller_profile_id,
        adminUserId,
        previousStatus: before.moderation_status,
        nextStatus: merged.moderationStatus,
        notes: merged.moderationNotes || null
      });
    }

    await safeAdminAuditLog(client, {
      adminUserId,
      actionType: 'product.update',
      targetEntity: 'product',
      targetId: productId,
      beforeData: before,
      afterData: updated,
      metadata: { sku: updated?.sku }
    });

    return updated;
  });
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct
};

