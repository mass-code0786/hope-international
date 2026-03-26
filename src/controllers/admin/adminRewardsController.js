const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminRewardsService = require('../../services/admin/adminRewardsService');

const qualifications = asyncHandler(async (req, res) => {
  const filters = {
    month: req.query.month,
    status: req.query.status,
    userId: req.query.userId,
    search: req.query.search
  };

  const result = await adminRewardsService.listQualifications(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Reward qualifications fetched successfully'
  });
});

const summary = asyncHandler(async (req, res) => {
  const data = await adminRewardsService.getSummary({ month: req.query.month });
  return success(res, {
    data,
    message: 'Reward summary fetched successfully'
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const data = await adminRewardsService.updateQualificationStatus(req.user.sub, req.params.id, req.body.status);
  return success(res, {
    data,
    message: 'Reward qualification status updated successfully'
  });
});

module.exports = {
  qualifications,
  summary,
  updateStatus
};
