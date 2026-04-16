const asyncHandler = require('../utils/asyncHandler');
const bannerService = require('../services/bannerService');

const list = asyncHandler(async (req, res) => {
  const requestedLimit = Math.floor(Number(req.query.limit));
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 20) : 10;
  const banners = await bannerService.listActiveBanners(null, limit);
  res.setHeader('Cache-Control', 'public, max-age=45, s-maxage=45');
  res.status(200).json(banners);
});

module.exports = {
  list
};
