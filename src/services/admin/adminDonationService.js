const { normalizePagination, buildPagination } = require('../../utils/pagination');
const donationRepository = require('../../repositories/donationRepository');
const donationService = require('../donationService');

async function listDonations(filters = {}, paginationInput = {}) {
  const pagination = normalizePagination({ ...paginationInput, limit: paginationInput.limit || 20, maxLimit: 100 });
  const result = await donationRepository.listAdminDonations(null, filters, pagination);

  return {
    data: await Promise.all(result.items.map(donationService.mapDonation)),
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total
    })
  };
}

module.exports = {
  listDonations
};
