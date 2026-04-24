const { withTransaction } = require('../db/pool');
const { ApiError } = require('../utils/ApiError');
const { normalizePagination, buildPagination } = require('../utils/pagination');
const helpingHandRepository = require('../repositories/helpingHandRepository');
const landingMediaStorageService = require('./landingMediaStorageService');

const REQUIRED_DEPOSIT = 1000;

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function mapApplication(row) {
  if (!row) return null;

  const documentRenderUrl = row.document_url
    ? (await landingMediaStorageService.resolveRenderableMediaUrl(row.document_url)) || row.document_url
    : null;

  return {
    ...row,
    requested_amount: toMoney(row.requested_amount),
    document_url: row.document_url || null,
    document_render_url: documentRenderUrl
  };
}

async function getEligibility(userId) {
  const totalDeposit = toMoney(await helpingHandRepository.getApprovedDepositTotalForUser(null, userId));
  return {
    eligible: totalDeposit >= REQUIRED_DEPOSIT,
    totalDeposit,
    requiredDeposit: REQUIRED_DEPOSIT
  };
}

async function assertEligible(client, userId) {
  const totalDeposit = toMoney(await helpingHandRepository.getApprovedDepositTotalForUser(client, userId));
  if (totalDeposit < REQUIRED_DEPOSIT) {
    throw new ApiError(403, 'Minimum $1000 deposit required to apply.');
  }
  return totalDeposit;
}

async function createApplication(userId, payload) {
  return withTransaction(async (client) => {
    await assertEligible(client, userId);

    let documentUrl = null;
    if (payload.documentDataUrl) {
      documentUrl = await landingMediaStorageService.saveUploadFile(`helping-hand-${userId}`, payload.documentDataUrl);
    }

    const created = await helpingHandRepository.createApplication(client, {
      userId,
      applicantName: payload.applicantName,
      applicantPhone: payload.applicantPhone,
      applicantAddress: payload.applicantAddress,
      applicantRelation: payload.applicantRelation,
      helpCategory: payload.helpCategory,
      requestedAmount: payload.requestedAmount,
      reason: payload.reason,
      documentUrl
    });

    const hydrated = await helpingHandRepository.getApplicationById(client, created.id);
    return mapApplication(hydrated);
  });
}

async function listUserApplications(userId, paginationInput = {}) {
  const pagination = normalizePagination({ ...paginationInput, limit: paginationInput.limit || 20, maxLimit: 50 });
  const result = await helpingHandRepository.listUserApplications(null, userId, pagination);

  return {
    data: await Promise.all(result.items.map(mapApplication)),
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total
    })
  };
}

module.exports = {
  REQUIRED_DEPOSIT,
  getEligibility,
  createApplication,
  listUserApplications,
  mapApplication
};
