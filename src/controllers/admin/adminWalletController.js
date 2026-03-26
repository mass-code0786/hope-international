const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminWalletService = require('../../services/admin/adminWalletService');

const transactions = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search,
    source: req.query.source,
    type: req.query.type,
    userId: req.query.userId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  };

  const result = await adminWalletService.listTransactions(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Admin wallet transactions fetched successfully'
  });
});

const summary = asyncHandler(async (_req, res) => {
  const data = await adminWalletService.getSummary();
  return success(res, {
    data,
    message: 'Admin wallet summary fetched successfully'
  });
});

const adjust = asyncHandler(async (req, res) => {
  const data = await adminWalletService.adjustWallet(req.user.sub, {
    userId: req.body.userId,
    amount: req.body.amount,
    type: req.body.type,
    reason: req.body.reason
  });

  return success(res, {
    data,
    message: 'Wallet adjusted successfully'
  });
});

module.exports = {
  transactions,
  summary,
  adjust
};
