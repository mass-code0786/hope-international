const cacheStore = new Map();

function getCacheEntry(key) {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value;
}

function setCacheEntry(key, value, ttlMs) {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, Number(ttlMs) || 1)
  });
  return value;
}

function clearCacheEntry(key) {
  cacheStore.delete(key);
}

function clearCacheEntriesByPrefix(prefix) {
  const safePrefix = String(prefix || '');
  if (!safePrefix) return;
  for (const key of cacheStore.keys()) {
    if (String(key).startsWith(safePrefix)) {
      cacheStore.delete(key);
    }
  }
}

module.exports = {
  getCacheEntry,
  setCacheEntry,
  clearCacheEntry,
  clearCacheEntriesByPrefix
};
