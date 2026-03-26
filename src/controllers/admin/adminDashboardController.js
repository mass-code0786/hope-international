const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminDashboardService = require('../../services/admin/adminDashboardService');

const overview = asyncHandler(async (_req, res) => {
  const data = await adminDashboardService.getDashboardOverview();
  return success(res, {
    data,
    message: 'Admin dashboard overview fetched successfully'
  });
});

module.exports = {
  overview
};
