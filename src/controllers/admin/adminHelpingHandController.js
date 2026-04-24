const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminHelpingHandService = require('../../services/admin/adminHelpingHandService');

const listApplications = asyncHandler(async (req, res) => {
  const result = await adminHelpingHandService.listApplications({
    search: req.query.search,
    status: req.query.status,
    userId: req.query.userId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  }, req.query);

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Helping Hand applications fetched successfully'
  });
});

const updateApplicationStatus = asyncHandler(async (req, res) => {
  const data = await adminHelpingHandService.updateApplicationStatus(req.user.sub, req.params.id, req.body);
  return success(res, {
    data,
    message: 'Helping Hand application updated successfully'
  });
});

module.exports = {
  listApplications,
  updateApplicationStatus
};
