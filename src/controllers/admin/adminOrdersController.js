const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminOrdersService = require('../../services/admin/adminOrdersService');

const list = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search,
    status: req.query.status,
    userId: req.query.userId,
    productId: req.query.productId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  };

  const result = await adminOrdersService.listOrders(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Admin orders fetched successfully'
  });
});

const getById = asyncHandler(async (req, res) => {
  const data = await adminOrdersService.getOrder(req.params.id);
  return success(res, {
    data,
    message: 'Admin order fetched successfully'
  });
});

module.exports = {
  list,
  getById
};
