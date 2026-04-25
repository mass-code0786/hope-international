const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const adminDepositsService = require('../../services/admin/adminDepositsService');

const list = asyncHandler(async (req, res) => {
  const result = await adminDepositsService.listDeposits({
    search: req.query.search,
    status: req.query.status
  }, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    message: 'Deposits fetched successfully'
  });
});

const approve = asyncHandler(async (req, res) => {
  const data = await adminDepositsService.approveDeposit(req.user.sub, req.params.id);
  return success(res, {
    data,
    message: 'Deposit approved successfully'
  });
});

const reject = asyncHandler(async (req, res) => {
  const data = await adminDepositsService.rejectDeposit(req.user.sub, req.params.id, {
    adminNote: req.body?.adminNote
  });
  return success(res, {
    data,
    message: 'Deposit rejected successfully'
  });
});

const transfer = asyncHandler(async (req, res) => {
  const data = await adminDepositsService.sendFunds(req.user.sub, {
    userId: req.body.userId,
    username: req.body.username,
    amount: req.body.amount,
    note: req.body.note
  });
  return success(res, {
    data,
    statusCode: 201,
    message: 'Funds sent successfully'
  });
});

module.exports = {
  list,
  approve,
  reject,
  transfer
};
