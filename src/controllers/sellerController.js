const asyncHandler = require('../utils/asyncHandler');
const sellerService = require('../services/sellerService');
const { success } = require('../utils/response');

const apply = asyncHandler(async (req, res) => {
  const data = await sellerService.apply(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Seller application submitted successfully'
  });
});

const me = asyncHandler(async (req, res) => {
  const data = await sellerService.getMe(req.user.sub);
  return success(res, {
    data,
    message: 'Seller profile fetched successfully'
  });
});

const access = asyncHandler(async (req, res) => {
  const data = await sellerService.getAccess(req.user.sub);
  return success(res, {
    data,
    message: 'Seller access fetched successfully'
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const data = await sellerService.createProduct(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Seller product submitted for moderation'
  });
});

const getProduct = asyncHandler(async (req, res) => {
  const data = await sellerService.getProduct(req.user.sub, req.params.id);
  return success(res, {
    data,
    message: 'Seller product fetched successfully'
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const data = await sellerService.updateProduct(req.user.sub, req.params.id, req.body);
  return success(res, {
    data,
    message: 'Seller product updated and resubmitted for moderation'
  });
});

const orders = asyncHandler(async (req, res) => {
  const result = await sellerService.listOrders(
    req.user.sub,
    {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      productId: req.query.productId
    },
    {
      page: req.query.page,
      limit: req.query.limit
    }
  );
  return success(res, {
    data: result.data,
    pagination: result.pagination,
    summary: result.summary,
    message: 'Seller orders fetched successfully'
  });
});

const payouts = asyncHandler(async (req, res) => {
  const result = await sellerService.getPayouts(
    req.user.sub,
    {
      status: req.query.status,
      periodStart: req.query.periodStart,
      periodEnd: req.query.periodEnd
    },
    {
      page: req.query.page,
      limit: req.query.limit
    }
  );
  return success(res, {
    data: result.data,
    pagination: result.pagination,
    summary: result.summary,
    message: 'Seller payouts fetched successfully'
  });
});

const uploadDocument = asyncHandler(async (req, res) => {
  const data = await sellerService.uploadDocument(req.user.sub, req.body);
  return success(res, {
    data,
    statusCode: 201,
    message: 'Seller document uploaded successfully'
  });
});

const listDocuments = asyncHandler(async (req, res) => {
  const data = await sellerService.listDocuments(req.user.sub);
  return success(res, {
    data,
    message: 'Seller documents fetched successfully'
  });
});

const deleteDocument = asyncHandler(async (req, res) => {
  const data = await sellerService.deleteDocument(req.user.sub, req.params.id);
  return success(res, {
    data,
    message: 'Seller document deleted successfully'
  });
});

module.exports = {
  apply,
  access,
  me,
  createProduct,
  getProduct,
  updateProduct,
  orders,
  payouts,
  uploadDocument,
  listDocuments,
  deleteDocument
};
