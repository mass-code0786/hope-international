const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminDonationService = require('../../services/admin/adminDonationService');

const listDonations = asyncHandler(async (req, res) => {
  const result = await adminDonationService.listDonations({
    search: req.query.search,
    status: req.query.status,
    userId: req.query.userId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  }, req.query);

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Donations fetched successfully'
  });
});

module.exports = {
  listDonations
};
