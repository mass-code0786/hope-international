const productRepository = require('../repositories/productRepository');
const { PV_TO_BV_RATIO } = require('../config/constants');

function toMoney(value) {
  return Number(Number(value).toFixed(2));
}

async function createProduct(client, payload) {
  const bv = Number(payload.bv);
  const pv = toMoney(bv * PV_TO_BV_RATIO);
  return productRepository.createProduct(client, { ...payload, bv, pv });
}

async function listProducts(client, onlyActive) {
  return productRepository.listProducts(client, onlyActive);
}

module.exports = {
  createProduct,
  listProducts
};
