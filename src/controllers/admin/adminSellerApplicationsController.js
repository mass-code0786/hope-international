const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminSellerApplicationsService = require('../../services/admin/adminSellerApplicationsService');

const list = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search,
    status: req.query.status
  };

  const result = await adminSellerApplicationsService.listApplications(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Seller applications fetched successfully'
  });
});

const review = asyncHandler(async (req, res) => {
  const data = await adminSellerApplicationsService.reviewApplication(req.user.sub, req.params.id, req.body);
  return success(res, {
    data,
    message: 'Seller application reviewed successfully'
  });
});

module.exports = {
  list,
  review
};
