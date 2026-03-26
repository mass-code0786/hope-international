const { withTransaction } = require('../../db/pool');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { ApiError } = require('../../utils/ApiError');
const adminRepository = require('../../repositories/adminRepository');

async function listQualifications(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await adminRepository.listRewardQualifications(null, filters, pagination);
  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function getSummary(filters) {
  return adminRepository.getRewardSummary(null, filters);
}

async function updateQualificationStatus(adminUserId, qualificationId, status) {
  return withTransaction(async (client) => {
    const before = await adminRepository.getRewardQualificationById(client, qualificationId);
    if (!before) {
      throw new ApiError(404, 'Qualification record not found');
    }

    const updated = await adminRepository.updateRewardQualificationStatus(client, qualificationId, status, adminUserId);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'reward.qualification.status.update',
      targetEntity: 'monthly_reward_qualification',
      targetId: qualificationId,
      beforeData: before,
      afterData: updated,
      metadata: { status }
    });

    return updated;
  });
}

module.exports = {
  listQualifications,
  getSummary,
  updateQualificationStatus
};
