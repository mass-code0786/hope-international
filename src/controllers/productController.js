const asyncHandler = require('../utils/asyncHandler');
const productService = require('../services/productService');
const { success } = require('../utils/response');

const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(null, req.body);
  res.status(201).json(product);
});

const list = asyncHandler(async (req, res) => {
  const onlyActive = req.query.active !== 'false';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const result = await productService.listProducts(null, {
    onlyActive,
    category: category || undefined,
    page: req.query.page,
    limit: req.query.limit
  });
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: result.data.length ? 'Products fetched successfully' : 'No products available'
  });
});

const getById = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(null, req.params.id);
  res.setHeader('Cache-Control', 'public, max-age=45, s-maxage=45');
  res.status(200).json(product);
});

module.exports = {
  create,
  list,
  getById
};
