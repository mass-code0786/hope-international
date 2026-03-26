const { randomUUID } = require('crypto');
const path = require('path');
const { withTransaction } = require('../db/pool');
const { ApiError } = require('../utils/ApiError');
const { normalizePagination, buildPagination } = require('../utils/pagination');
const { PV_TO_BV_RATIO } = require('../config/constants');
const sellerRepository = require('../repositories/sellerRepository');
const userRepository = require('../repositories/userRepository');

const ALLOWED_DOC_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

function toMoney(value) {
  return Number(Number(value).toFixed(2));
}

function derivePrivateDocumentUrl(sellerProfileId, fileName) {
  const ext = path.extname(fileName || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  return `private://seller-documents/${sellerProfileId}/${randomUUID()}${ext || ''}`;
}

function assertSellerRoleEligibility(role) {
  if (!['user', 'seller'].includes(role)) {
    throw new ApiError(403, 'Only normal users can apply for seller account');
  }
}

async function getApprovedProfile(client, userId) {
  const profile = await sellerRepository.getSellerProfileByUserId(client, userId);
  if (!profile || profile.application_status !== 'approved') {
    throw new ApiError(403, 'Approved seller profile required');
  }
  return profile;
}

async function apply(userId, payload) {
  return withTransaction(async (client) => {
    const user = await userRepository.findById(client, userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    assertSellerRoleEligibility(user.role);

    const existing = await sellerRepository.getSellerProfileByUserId(client, userId);
    if (existing?.application_status === 'approved') {
      throw new ApiError(409, 'Seller profile is already approved');
    }

    const profile = await sellerRepository.upsertSellerProfile(client, userId, payload);
    const documents = await sellerRepository.replaceSellerDocuments(client, profile.id, payload.documents || [], userId);

    await sellerRepository.logSellerActivity(client, {
      actorUserId: userId,
      sellerProfileId: profile.id,
      actionType: 'seller.application.submit',
      targetEntity: 'seller_profile',
      targetId: profile.id,
      metadata: {
        documentsCount: documents.length
      }
    });

    return {
      profile,
      documents
    };
  });
}

async function getMe(userId) {
  const profile = await sellerRepository.getSellerProfileByUserId(null, userId);
  if (!profile) {
    return {
      profile: null,
      documents: [],
      products: [],
      recentModeration: [],
      summary: null,
      canAccessDashboard: false
    };
  }

  const [documents, products, productSummary, orderSummary, recentModeration] = await Promise.all([
    sellerRepository.getSellerDocuments(null, profile.id),
    sellerRepository.listSellerProducts(null, profile.id),
    sellerRepository.getSellerProductSummary(null, profile.id),
    sellerRepository.getSellerOrderSummary(null, profile.id),
    sellerRepository.getRecentModerationActivity(null, profile.id, 5)
  ]);

  return {
    profile,
    documents,
    products,
    recentModeration,
    summary: {
      ...productSummary,
      ...orderSummary
    },
    canAccessDashboard: profile.application_status === 'approved'
  };
}

async function createProduct(userId, payload) {
  return withTransaction(async (client) => {
    const profile = await getApprovedProfile(client, userId);

    const bv = Number(payload.bv);
    const pv = toMoney(bv * PV_TO_BV_RATIO);

    const created = await sellerRepository.createSellerProduct(client, {
      ...payload,
      bv,
      pv,
      sellerProfileId: profile.id
    });

    await sellerRepository.logSellerActivity(client, {
      actorUserId: userId,
      sellerProfileId: profile.id,
      actionType: 'seller.product.create',
      targetEntity: 'product',
      targetId: created.id,
      metadata: {
        sku: created.sku
      }
    });

    return created;
  });
}

async function getProduct(userId, productId) {
  const profile = await getApprovedProfile(null, userId);
  const product = await sellerRepository.findSellerProductById(null, productId);
  if (!product) {
    throw new ApiError(404, 'Seller product not found');
  }
  if (product.seller_profile_id !== profile.id) {
    throw new ApiError(403, 'You are not allowed to access this seller product');
  }
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    bv: product.bv,
    pv: product.pv,
    moderation_status: product.moderation_status,
    moderation_notes: product.moderation_notes,
    is_active: product.is_active,
    created_at: product.created_at,
    updated_at: product.updated_at
  };
}

async function updateProduct(userId, productId, payload) {
  return withTransaction(async (client) => {
    const profile = await getApprovedProfile(client, userId);

    const existing = await sellerRepository.findSellerProductById(client, productId);
    if (!existing) {
      throw new ApiError(404, 'Seller product not found');
    }
    if (existing.seller_profile_id !== profile.id) {
      throw new ApiError(403, 'You are not allowed to update this seller product');
    }

    const bv = Number(payload.bv);
    const pv = toMoney(bv * PV_TO_BV_RATIO);

    const updated = await sellerRepository.updateSellerProduct(client, productId, {
      ...payload,
      bv,
      pv
    });

    await sellerRepository.logSellerActivity(client, {
      actorUserId: userId,
      sellerProfileId: profile.id,
      actionType: 'seller.product.update',
      targetEntity: 'product',
      targetId: productId,
      metadata: {
        previousModerationStatus: existing.moderation_status,
        nextModerationStatus: updated?.moderation_status
      }
    });

    return updated;
  });
}

async function listOrders(userId, filters, paginationInput) {
  const profile = await getApprovedProfile(null, userId);
  const pagination = normalizePagination(paginationInput);
  const result = await sellerRepository.listSellerOrders(null, profile.id, filters, pagination);
  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total }),
    summary: result.summary
  };
}

async function getPayouts(userId, filters, paginationInput) {
  const profile = await getApprovedProfile(null, userId);
  const pagination = normalizePagination(paginationInput);

  const [summary, history, periodSummary] = await Promise.all([
    sellerRepository.getSellerPayoutSummary(null, profile.id),
    sellerRepository.listSellerPayouts(null, profile.id, filters, pagination),
    sellerRepository.getSellerPayoutPeriodSummary(null, profile.id, 6)
  ]);

  return {
    data: {
      payoutHistory: history.items,
      periodSummaries: periodSummary
    },
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: history.total }),
    summary
  };
}

async function uploadDocument(userId, payload) {
  return withTransaction(async (client) => {
    const profile = await getApprovedProfile(client, userId);
    if (!ALLOWED_DOC_MIME.has(payload.mimeType)) {
      throw new ApiError(400, 'Unsupported document mime type');
    }
    if (
      payload.documentUrl &&
      !String(payload.documentUrl).startsWith('https://') &&
      !String(payload.documentUrl).startsWith('private://')
    ) {
      throw new ApiError(400, 'documentUrl must be https:// or private://');
    }

    const document = await sellerRepository.createSellerDocument(client, {
      sellerProfileId: profile.id,
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
      documentUrl: payload.documentUrl || derivePrivateDocumentUrl(profile.id, payload.fileName),
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      fileSizeBytes: payload.fileSizeBytes,
      notes: payload.notes,
      uploadedBy: userId
    });

    await sellerRepository.logSellerActivity(client, {
      actorUserId: userId,
      sellerProfileId: profile.id,
      actionType: 'seller.document.upload',
      targetEntity: 'seller_document',
      targetId: document.id,
      metadata: {
        documentType: document.document_type,
        mimeType: document.mime_type,
        fileSizeBytes: document.file_size_bytes
      }
    });

    return document;
  });
}

async function listDocuments(userId) {
  const profile = await getApprovedProfile(null, userId);
  return sellerRepository.getSellerDocuments(null, profile.id);
}

async function deleteDocument(userId, documentId) {
  return withTransaction(async (client) => {
    const profile = await getApprovedProfile(client, userId);
    const existing = await sellerRepository.getSellerDocumentById(client, profile.id, documentId);
    if (!existing) {
      throw new ApiError(404, 'Seller document not found');
    }

    const deleted = await sellerRepository.softDeleteSellerDocument(client, profile.id, documentId);
    await sellerRepository.logSellerActivity(client, {
      actorUserId: userId,
      sellerProfileId: profile.id,
      actionType: 'seller.document.delete',
      targetEntity: 'seller_document',
      targetId: documentId,
      metadata: {
        documentType: existing.document_type
      }
    });
    return deleted;
  });
}

module.exports = {
  apply,
  getMe,
  createProduct,
  getProduct,
  updateProduct,
  listOrders,
  getPayouts,
  uploadDocument,
  listDocuments,
  deleteDocument
};
