const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const helpingHandService = require('../services/helpingHandService');
const { ApiError } = require('../utils/ApiError');

const eligibility = asyncHandler(async (req, res) => {
  const data = await helpingHandService.getEligibility(req.user.sub);
  return success(res, {
    data,
    message: data.eligible ? 'Helping Hand is available' : 'Minimum $1000 deposit required to apply.'
  });
});

const createApplication = asyncHandler(async (req, res) => {
  try {
    const data = await helpingHandService.createApplication(req.user.sub, req.body);
    return success(res, {
      data,
      statusCode: 201,
      message: 'Helping Hand application submitted successfully'
    });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 403 && error.message === 'Minimum $1000 total deposit required.') {
      return res.status(403).json({
        success: false,
        message: 'Minimum $1000 total deposit required.'
      });
    }
    throw error;
  }
});

const myApplications = asyncHandler(async (req, res) => {
  const result = await helpingHandService.listUserApplications(req.user.sub, req.query);
  return res.status(200).json({
    items: result.items,
    pagination: result.pagination
  });
});

module.exports = {
  eligibility,
  createApplication,
  myApplications
};
