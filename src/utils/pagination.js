function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : fallback;
}

function normalizePagination({ page = 1, limit = 10, maxLimit = 100 } = {}) {
  const safeMaxLimit = Math.max(1, toPositiveInteger(maxLimit, 100));
  const safePage = toPositiveInteger(page, 1);
  const requestedLimit = toPositiveInteger(limit, 10);
  const safeLimit = Math.max(1, Math.min(safeMaxLimit, requestedLimit));
  const offset = Math.max(0, (safePage - 1) * safeLimit);
  return {
    page: safePage,
    limit: safeLimit,
    offset
  };
}

function buildPagination({ page, limit, total }) {
  const totalItems = Number(total || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    page,
    limit,
    totalItems,
    totalPages
  };
}

function buildListPagination({ page, limit, total }) {
  return {
    page: toPositiveInteger(page, 1),
    limit: toPositiveInteger(limit, 10),
    total: Math.max(0, Number(total || 0))
  };
}

module.exports = {
  normalizePagination,
  buildPagination,
  buildListPagination
};
