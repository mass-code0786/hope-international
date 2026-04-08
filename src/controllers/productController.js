const asyncHandler = require('../utils/asyncHandler');
const productService = require('../services/productService');

const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(null, req.body);
  res.status(201).json(product);
});

const list = asyncHandler(async (req, res) => {
  const onlyActive = req.query.active !== 'false';
  const products = await productService.listProducts(null, onlyActive);
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
  res.status(200).json(products);
});

module.exports = {
  create,
  list
};
