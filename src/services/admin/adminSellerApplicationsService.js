const { withTransaction } = require('../../db/pool');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { ApiError } = require('../../utils/ApiError');
const sellerRepository = require('../../repositories/sellerRepository');
const adminRepository = require('../../repositories/adminRepository');

async function listApplications(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await sellerRepository.listSellerApplications(null, filters, pagination);
  return {
    data: result.items,
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total
    })
  };
}

async function reviewApplication(adminUserId, profileId, payload) {
  return withTransaction(async (client) => {
    const before = await sellerRepository.getSellerProfileById(client, profileId);
    if (!before) {
      throw new ApiError(404, 'Seller application not found');
    }

    const updated = await sellerRepository.reviewSellerApplication(client, profileId, {
      status: payload.status,
      rejectionReason: payload.rejectionReason,
      reviewedBy: adminUserId
    });

    if (payload.status === 'approved') {
      await sellerRepository.setUserRole(client, updated.user_id, 'seller');
    } else if (payload.status === 'rejected' && before.role === 'seller') {
      await sellerRepository.setUserRole(client, updated.user_id, 'user');
    }

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'seller.application.review',
      targetEntity: 'seller_profile',
      targetId: profileId,
      beforeData: before,
      afterData: updated,
      metadata: {
        status: payload.status,
        rejectionReason: payload.rejectionReason || null,
        notes: payload.notes || null
      }
    });

    return updated;
  });
}

module.exports = {
  listApplications,
  reviewApplication
};
