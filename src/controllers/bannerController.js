const asyncHandler = require('../utils/asyncHandler');
const bannerService = require('../services/bannerService');

const list = asyncHandler(async (_req, res) => {
  const banners = await bannerService.listActiveBanners();
  res.status(200).json(banners);
});

module.exports = {
  list
};
