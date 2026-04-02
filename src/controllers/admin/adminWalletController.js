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

const deposits = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search,
    status: req.query.status,
    userId: req.query.userId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  };

  const result = await adminWalletService.listDeposits(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Admin deposits fetched successfully'
  });
});

const reviewDeposit = asyncHandler(async (req, res) => {
  const data = await adminWalletService.reviewDeposit(req.user.sub, req.params.id, {
    status: req.body.status,
    adminNote: req.body.adminNote
  });

  return success(res, {
    data,
    message: 'Deposit reviewed successfully'
  });
});

const withdrawals = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search,
    status: req.query.status,
    userId: req.query.userId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  };

  const result = await adminWalletService.listWithdrawals(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Admin withdrawals fetched successfully'
  });
});

const reviewWithdrawal = asyncHandler(async (req, res) => {
  const data = await adminWalletService.reviewWithdrawal(req.user.sub, req.params.id, {
    status: req.body.status,
    adminNote: req.body.adminNote
  });

  return success(res, {
    data,
    message: 'Withdrawal reviewed successfully'
  });
});

const p2p = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search,
    senderId: req.query.senderId,
    receiverId: req.query.receiverId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  };

  const result = await adminWalletService.listP2p(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Admin p2p transfers fetched successfully'
  });
});

const bindings = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search,
    userId: req.query.userId
  };

  const result = await adminWalletService.listBindings(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Admin wallet bindings fetched successfully'
  });
});

const upsertBinding = asyncHandler(async (req, res) => {
  const data = await adminWalletService.upsertBinding(req.user.sub, req.params.userId, {
    walletAddress: req.body.walletAddress,
    network: req.body.network
  });

  return success(res, {
    data,
    message: 'Wallet binding updated successfully'
  });
});

const removeBinding = asyncHandler(async (req, res) => {
  const data = await adminWalletService.removeBinding(req.user.sub, req.params.userId);
  return success(res, {
    data,
    message: 'Wallet binding removed successfully'
  });
});

const income = asyncHandler(async (req, res) => {
  const filters = {
    search: req.query.search,
    source: req.query.source,
    userId: req.query.userId,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo
  };

  const result = await adminWalletService.listIncome(filters, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Admin income transactions fetched successfully'
  });
});

const userFinancialOverview = asyncHandler(async (req, res) => {
  const data = await adminWalletService.getUserFinancialOverview(req.params.id);
  return success(res, {
    data,
    message: 'Admin user financial overview fetched successfully'
  });
});

const btctStaking = asyncHandler(async (_req, res) => {
  const data = await adminWalletService.listBtctStaking();
  return success(res, {
    data,
    message: 'Admin BTCT staking fetched successfully'
  });
});

const runBtctStakingPayouts = asyncHandler(async (req, res) => {
  const data = await adminWalletService.runBtctStakingPayouts({
    asOf: req.body?.asOf,
    limit: req.body?.limit
  });
  return success(res, {
    data,
    message: 'BTCT staking payouts processed successfully'
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
  deposits,
  reviewDeposit,
  withdrawals,
  reviewWithdrawal,
  p2p,
  bindings,
  upsertBinding,
  removeBinding,
  income,
  userFinancialOverview,
  btctStaking,
  runBtctStakingPayouts,
  adjust
};
