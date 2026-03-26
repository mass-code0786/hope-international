const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminCompensationService = require('../../services/admin/adminCompensationService');

const listWeekly = asyncHandler(async (req, res) => {
  const result = await adminCompensationService.listWeekly({}, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Weekly compensation cycles fetched successfully'
  });
});

const getWeeklyById = asyncHandler(async (req, res) => {
  const data = await adminCompensationService.getWeeklyCycle(req.params.cycleId);
  return success(res, {
    data,
    message: 'Weekly cycle detail fetched successfully'
  });
});

const runWeekly = asyncHandler(async (req, res) => {
  const data = await adminCompensationService.runWeekly(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Weekly matching run completed'
  });
});

const runSettlements = asyncHandler(async (req, res) => {
  const data = await adminCompensationService.runSettlements(req.user.sub, req.body || {});
  return success(res, {
    data,
    statusCode: 201,
    message: 'Order settlement run completed'
  });
});

const listMonthly = asyncHandler(async (req, res) => {
  const result = await adminCompensationService.listMonthly({}, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Monthly compensation cycles fetched successfully'
  });
});

const getMonthlyById = asyncHandler(async (req, res) => {
  const data = await adminCompensationService.getMonthlyCycle(req.params.cycleId);
  return success(res, {
    data,
    message: 'Monthly cycle detail fetched successfully'
  });
});

const runMonthly = asyncHandler(async (req, res) => {
  const data = await adminCompensationService.runMonthly(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Monthly rewards run completed'
  });
});

module.exports = {
  listWeekly,
  getWeeklyById,
  runWeekly,
  runSettlements,
  listMonthly,
  getMonthlyById,
  runMonthly
};
