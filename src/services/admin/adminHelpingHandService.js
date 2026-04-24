const { withTransaction } = require('../../db/pool');
const { ApiError } = require('../../utils/ApiError');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const helpingHandRepository = require('../../repositories/helpingHandRepository');
const helpingHandService = require('../helpingHandService');
const adminRepository = require('../../repositories/adminRepository');

async function listApplications(filters = {}, paginationInput = {}) {
  const pagination = normalizePagination({ ...paginationInput, limit: paginationInput.limit || 20, maxLimit: 100 });
  const result = await helpingHandRepository.listAdminApplications(null, filters, pagination);

  return {
    data: await Promise.all(result.items.map(helpingHandService.mapApplication)),
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total
    })
  };
}

async function updateApplicationStatus(adminUserId, applicationId, payload) {
  return withTransaction(async (client) => {
    const before = await helpingHandRepository.getApplicationById(client, applicationId);
    if (!before) {
      throw new ApiError(404, 'Helping Hand application not found');
    }

    const updated = await helpingHandRepository.updateApplicationStatus(client, applicationId, {
      status: payload.status,
      adminNote: payload.adminNote
    });
    const after = await helpingHandRepository.getApplicationById(client, updated.id);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'helping_hand.application.review',
      targetEntity: 'helping_hand_applications',
      targetId: updated.id,
      beforeData: before,
      afterData: after,
      metadata: {
        status: payload.status,
        adminNote: payload.adminNote || null
      }
    });

    return helpingHandService.mapApplication(after);
  });
}

module.exports = {
  listApplications,
  updateApplicationStatus
};
