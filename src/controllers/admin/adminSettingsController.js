const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminSettingsService = require('../../services/admin/adminSettingsService');

const get = asyncHandler(async (_req, res) => {
  const data = await adminSettingsService.getSettings();
  return success(res, {
    data,
    message: 'Admin settings fetched successfully'
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await adminSettingsService.updateSettings(req.user.sub, req.body);
  return success(res, {
    data,
    message: 'Admin settings updated successfully'
  });
});

module.exports = {
  get,
  update
};
