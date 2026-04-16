const productRepository = require('../repositories/productRepository');
const { PV_TO_BV_RATIO } = require('../config/constants');
const { ApiError } = require('../utils/ApiError');
const { getCacheEntry, setCacheEntry, clearCacheEntriesByPrefix } = require('../utils/runtimeCache');
const { withPerfSpan } = require('../utils/perf');
const { normalizePagination, buildPagination } = require('../utils/pagination');

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

async function listProducts(client, { onlyActive = true, page = 1, limit = 20 } = {}) {
  const pagination = normalizePagination({ page, limit, maxLimit: 50 });
  const cacheKey = `${PRODUCT_LIST_CACHE_PREFIX}${onlyActive ? 'active' : 'all'}:${pagination.page}:${pagination.limit}`;
  const cached = getCacheEntry(cacheKey);
  if (cached) return cached;

  return withPerfSpan('products.list', async () => {
    const result = await productRepository.listProducts(client, {
      onlyActive,
      limit: pagination.limit,
      offset: pagination.offset
    });
    const pageInfo = buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      total: result.total
    });
    const payload = {
      data: result.items,
      pagination: {
        ...pageInfo,
        hasMore: pageInfo.page < pageInfo.totalPages,
        nextPage: pageInfo.page < pageInfo.totalPages ? pageInfo.page + 1 : null
      }
    };
    return setCacheEntry(cacheKey, payload, PRODUCT_CACHE_TTL_MS);
  }, {
    thresholdMs: 120,
    meta: { onlyActive: Boolean(onlyActive), page: pagination.page, limit: pagination.limit }
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
