const asyncHandler = require('../utils/asyncHandler');
const hopeMillionaireService = require('../services/hopeMillionaireService');
const { success } = require('../utils/response');

const dashboard = asyncHandler(async (req, res) => success(res, {
  data: await hopeMillionaireService.getDashboard(req.user.sub),
  message: 'Hope Millionaire dashboard fetched successfully'
}));

const join = asyncHandler(async (req, res) => {
  const data = await hopeMillionaireService.joinPackage(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: data.duplicateRequest ? 200 : 201,
    message: data.duplicateRequest ? 'Hope Millionaire purchase already processed' : 'Hope Millionaire package joined successfully'
  });
});

module.exports = { dashboard, join };
