const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminGalleryService = require('../../services/admin/adminGalleryService');

const listItems = asyncHandler(async (_req, res) => {
  const data = await adminGalleryService.listAdminGalleryItems();
  return success(res, {
    data,
    message: 'Gallery items fetched successfully'
  });
});

const createItem = asyncHandler(async (req, res) => {
  const data = await adminGalleryService.createGalleryItem(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Gallery item created successfully'
  });
});

const updateItem = asyncHandler(async (req, res) => {
  const data = await adminGalleryService.updateGalleryItem(req.user.sub, req.params.id, req.body);
  return success(res, {
    data,
    message: 'Gallery item updated successfully'
  });
});

const deleteItem = asyncHandler(async (req, res) => {
  const data = await adminGalleryService.deleteGalleryItem(req.user.sub, req.params.id);
  return success(res, {
    data,
    message: 'Gallery item deleted successfully'
  });
});

module.exports = {
  listItems,
  createItem,
  updateItem,
  deleteItem
};
