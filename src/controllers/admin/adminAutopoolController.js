const asyncHandler = require('../../utils/asyncHandler');
const adminAutopoolService = require('../../services/admin/adminAutopoolService');

const reset = asyncHandler(async (req, res) => {
  await adminAutopoolService.resetAutopool(req.user.sub, req.body);
  return res.status(200).json({
    success: true,
    message: 'Autopool reset successfully'
  });
});

module.exports = {
  reset
};
