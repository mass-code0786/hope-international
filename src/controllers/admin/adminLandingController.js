const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminLandingService = require('../../services/admin/adminLandingService');

const getState = asyncHandler(async (_req, res) => {
  const data = await adminLandingService.getLandingAdminState();
  return success(res, {
    data,
    message: 'Landing page admin data fetched successfully'
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const data = await adminLandingService.updateLandingSettings(req.user.sub, req.body);
  return success(res, {
    data,
    message: 'Landing settings updated successfully'
  });
});

const updateStats = asyncHandler(async (req, res) => {
  const data = await adminLandingService.updateLandingStats(req.user.sub, req.body);
  return success(res, {
    data,
    message: 'Landing stats updated successfully'
  });
});

const createFeaturedItem = asyncHandler(async (req, res) => {
  const data = await adminLandingService.createLandingEntity(req.user.sub, 'featured-item', req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Landing featured item created successfully'
  });
});

const updateFeaturedItem = asyncHandler(async (req, res) => {
  const data = await adminLandingService.updateLandingEntity(req.user.sub, 'featured-item', req.params.id, req.body);
  return success(res, {
    data,
    message: 'Landing featured item updated successfully'
  });
});

const deleteFeaturedItem = asyncHandler(async (req, res) => {
  const data = await adminLandingService.deleteLandingEntity(req.user.sub, 'featured-item', req.params.id);
  return success(res, {
    data,
    message: 'Landing featured item deleted successfully'
  });
});

const createContentBlock = asyncHandler(async (req, res) => {
  const data = await adminLandingService.createLandingEntity(req.user.sub, 'content-block', req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Landing content block created successfully'
  });
});

const updateContentBlock = asyncHandler(async (req, res) => {
  const data = await adminLandingService.updateLandingEntity(req.user.sub, 'content-block', req.params.id, req.body);
  return success(res, {
    data,
    message: 'Landing content block updated successfully'
  });
});

const deleteContentBlock = asyncHandler(async (req, res) => {
  const data = await adminLandingService.deleteLandingEntity(req.user.sub, 'content-block', req.params.id);
  return success(res, {
    data,
    message: 'Landing content block deleted successfully'
  });
});

const createTestimonial = asyncHandler(async (req, res) => {
  const data = await adminLandingService.createLandingEntity(req.user.sub, 'testimonial', req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Landing testimonial created successfully'
  });
});

const updateTestimonial = asyncHandler(async (req, res) => {
  const data = await adminLandingService.updateLandingEntity(req.user.sub, 'testimonial', req.params.id, req.body);
  return success(res, {
    data,
    message: 'Landing testimonial updated successfully'
  });
});

const deleteTestimonial = asyncHandler(async (req, res) => {
  const data = await adminLandingService.deleteLandingEntity(req.user.sub, 'testimonial', req.params.id);
  return success(res, {
    data,
    message: 'Landing testimonial deleted successfully'
  });
});

const createCountry = asyncHandler(async (req, res) => {
  const data = await adminLandingService.createLandingEntity(req.user.sub, 'country', req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Landing country created successfully'
  });
});

const updateCountry = asyncHandler(async (req, res) => {
  const data = await adminLandingService.updateLandingEntity(req.user.sub, 'country', req.params.id, req.body);
  return success(res, {
    data,
    message: 'Landing country updated successfully'
  });
});

const deleteCountry = asyncHandler(async (req, res) => {
  const data = await adminLandingService.deleteLandingEntity(req.user.sub, 'country', req.params.id);
  return success(res, {
    data,
    message: 'Landing country deleted successfully'
  });
});

module.exports = {
  getState,
  updateSettings,
  updateStats,
  createFeaturedItem,
  updateFeaturedItem,
  deleteFeaturedItem,
  createContentBlock,
  updateContentBlock,
  deleteContentBlock,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  createCountry,
  updateCountry,
  deleteCountry
};
