function normalizePagination({ page = 1, limit = 20, maxLimit = 100 }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(maxLimit, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;
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

module.exports = {
  normalizePagination,
  buildPagination
};
