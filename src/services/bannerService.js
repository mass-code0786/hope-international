const bannerRepository = require('../repositories/bannerRepository');
const { getCacheEntry, setCacheEntry, clearCacheEntriesByPrefix } = require('../utils/runtimeCache');
const { withPerfSpan } = require('../utils/perf');

const BANNER_LIST_CACHE_PREFIX = 'banners:list:';
const BANNER_CACHE_TTL_MS = 45_000;

async function listActiveBanners(client = null, limit = 5) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 20));
  const cacheKey = `${BANNER_LIST_CACHE_PREFIX}${safeLimit}`;
  const cached = getCacheEntry(cacheKey);
  if (cached) return cached;

  return withPerfSpan('banners.list', async () => {
    const items = await bannerRepository.listActiveBanners(client, safeLimit);
    return setCacheEntry(cacheKey, items, BANNER_CACHE_TTL_MS);
  }, {
    thresholdMs: 100,
    meta: { limit: safeLimit }
  });
}

function clearBannerListCache() {
  clearCacheEntriesByPrefix(BANNER_LIST_CACHE_PREFIX);
}

module.exports = {
  listActiveBanners,
  clearBannerListCache
};
