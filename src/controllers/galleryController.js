const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const galleryService = require('../services/galleryService');

const listVisibleItems = asyncHandler(async (_req, res) => {
  const data = await galleryService.listVisibleGalleryItems();
  return success(res, {
    data,
    message: 'Gallery items fetched successfully'
  });
});

module.exports = {
  listVisibleItems
};
