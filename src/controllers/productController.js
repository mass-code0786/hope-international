const asyncHandler = require('../utils/asyncHandler');
const productService = require('../services/productService');

const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(null, req.body);
  res.status(201).json(product);
});

const list = asyncHandler(async (req, res) => {
  const onlyActive = req.query.active !== 'false';
  const requestedLimit = Math.floor(Number(req.query.limit));
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 20) : 10;
  const products = await productService.listProducts(null, onlyActive, limit);
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
  res.status(200).json(products);
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
