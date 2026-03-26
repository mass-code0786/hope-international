const { ApiError } = require('../../utils/ApiError');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const adminRepository = require('../../repositories/adminRepository');

async function listOrders(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await adminRepository.listOrders(null, filters, pagination);
  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function getOrder(orderId) {
  const order = await adminRepository.getOrderById(null, orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  return order;
}

module.exports = {
  listOrders,
  getOrder
};
