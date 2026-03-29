const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const landingService = require('../services/landingService');

const getPublicPage = asyncHandler(async (_req, res) => {
  const data = await landingService.getPublicLandingPage();
  return success(res, {
    data,
    message: 'Landing page content fetched successfully'
  });
});

const trackVisit = asyncHandler(async (req, res) => {
  const data = await landingService.trackLandingVisit(req.body?.visitorToken);
  return success(res, {
    data,
    message: 'Landing page visit tracked successfully'
  });
});

module.exports = {
  getPublicPage,
  trackVisit
};
