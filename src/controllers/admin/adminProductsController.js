const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminProductsService = require('../../services/admin/adminProductsService');

const list = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search,
    category: req.query.category,
    isActive: req.query.isActive === undefined ? undefined : req.query.isActive === 'true',
    isQualifying: req.query.isQualifying === undefined ? undefined : req.query.isQualifying === 'true'
  };

  const result = await adminProductsService.listProducts(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Admin products fetched successfully'
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await adminProductsService.getProduct(req.params.id);
  return success(res, {
    data,
    message: 'Admin product fetched successfully'
  });
});

const create = asyncHandler(async (req, res) => {
  const data = await adminProductsService.createProduct(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Admin product created successfully'
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await adminProductsService.updateProduct(req.user.sub, req.params.id, req.body);
  return success(res, {
    data,
    message: 'Admin product updated successfully'
  });
});

module.exports = {
  list,
  getById,
  create,
  update
};
