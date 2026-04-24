const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const helpingHandService = require('../services/helpingHandService');

const eligibility = asyncHandler(async (req, res) => {
  const data = await helpingHandService.getEligibility(req.user.sub);
  return success(res, {
    data,
    message: data.eligible ? 'Helping Hand is available' : 'Minimum $1000 deposit required to apply.'
  });
});

const createApplication = asyncHandler(async (req, res) => {
  const data = await helpingHandService.createApplication(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Helping Hand application submitted successfully'
  });
});

const myApplications = asyncHandler(async (req, res) => {
  const result = await helpingHandService.listUserApplications(req.user.sub, req.query);
  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Helping Hand applications fetched successfully'
  });
});

module.exports = {
  eligibility,
  createApplication,
  myApplications
};
