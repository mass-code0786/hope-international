const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminBannersService = require('../../services/admin/adminBannersService');

const list = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search,
    isActive: req.query.isActive === undefined ? undefined : req.query.isActive === 'true'
  };

  const result = await adminBannersService.listBanners(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Admin banners fetched successfully'
  });
});

const create = asyncHandler(async (req, res) => {
  const data = await adminBannersService.createBanner(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Banner created successfully'
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await adminBannersService.updateBanner(req.user.sub, req.params.id, req.body);
  return success(res, {
    data,
    message: 'Banner updated successfully'
  });
});

const remove = asyncHandler(async (req, res) => {
  const data = await adminBannersService.deleteBanner(req.user.sub, req.params.id);
  return success(res, {
    data,
    message: 'Banner deleted successfully'
  });
});

module.exports = {
  list,
  create,
  update,
  remove
};
