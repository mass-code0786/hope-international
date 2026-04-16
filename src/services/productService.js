const productRepository = require('../repositories/productRepository');
const { PV_TO_BV_RATIO } = require('../config/constants');
const { ApiError } = require('../utils/ApiError');
const { getCacheEntry, setCacheEntry, clearCacheEntriesByPrefix } = require('../utils/runtimeCache');
const { withPerfSpan } = require('../utils/perf');

const PRODUCT_LIST_CACHE_PREFIX = 'products:list:';
const PRODUCT_DETAIL_CACHE_PREFIX = 'products:detail:';
const PRODUCT_CACHE_TTL_MS = 45_000;

function toMoney(value) {
  return Number(Number(value).toFixed(2));
}

async function createProduct(client, payload) {
  const bv = Number(payload.bv);
  const pv = toMoney(bv * PV_TO_BV_RATIO);
  const created = await productRepository.createProduct(client, { ...payload, bv, pv });
  clearCacheEntriesByPrefix(PRODUCT_LIST_CACHE_PREFIX);
  clearCacheEntriesByPrefix(PRODUCT_DETAIL_CACHE_PREFIX);
  return created;
}

async function listProducts(client, onlyActive, limit = 10) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 20));
  const cacheKey = `${PRODUCT_LIST_CACHE_PREFIX}${onlyActive ? 'active' : 'all'}:${safeLimit}`;
  const cached = getCacheEntry(cacheKey);
  if (cached) return cached;

  return withPerfSpan('products.list', async () => {
    const items = await productRepository.listProducts(client, onlyActive, safeLimit);
    return setCacheEntry(cacheKey, items, PRODUCT_CACHE_TTL_MS);
  }, {
    thresholdMs: 120,
    meta: { onlyActive: Boolean(onlyActive), limit: safeLimit }
  });
}

async function getProduct(client, productId) {
  const safeId = String(productId || '').trim();
  if (!safeId) {
    throw new ApiError(404, 'Product not found');
  }

  const cacheKey = `${PRODUCT_DETAIL_CACHE_PREFIX}${safeId}`;
  const cached = getCacheEntry(cacheKey);
  if (cached) return cached;

  return withPerfSpan('products.detail', async () => {
    const product = await productRepository.findById(client, safeId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    return setCacheEntry(cacheKey, product, PRODUCT_CACHE_TTL_MS);
  }, {
    thresholdMs: 120,
    meta: { productId: safeId }
  });
}

module.exports = {
  createProduct,
  listProducts,
  getProduct
};
