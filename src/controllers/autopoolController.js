const asyncHandler = require('../utils/asyncHandler');
const autopoolService = require('../services/autopoolService');
const { success } = require('../utils/response');

const summary = asyncHandler(async (req, res) => {
  const data = await autopoolService.getDashboard(req.user.sub);
  return success(res, {
    data,
    message: 'Autopool overview fetched successfully'
  });
});

const history = asyncHandler(async (req, res) => {
  const result = await autopoolService.getHistory(req.user.sub, req.query);
  return success(res, {
    data: result.data,
    pagination: result.pagination,
    summary: result.summary,
    message: 'Autopool history fetched successfully'
  });
});

const enter = asyncHandler(async (req, res) => {
  const data = await autopoolService.enterAutopool(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: data.duplicateRequest ? 200 : 201,
    message: data.duplicateRequest ? 'Autopool entry already processed' : 'Autopool entry created successfully'
  });
});

module.exports = {
  summary,
  history,
  enter
};
