const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/paymentService');
const { success } = require('../utils/response');

const createNowPaymentsPayment = asyncHandler(async (req, res) => {
  const data = await paymentService.createNowPaymentsDepositPayment(req.user.sub, {
    amount: req.body.amount,
    payCurrency: req.body.payCurrency,
    network: req.body.network
  });

  return success(res, {
    data,
    statusCode: 201,
    message: 'NOWPayments payment created successfully'
  });
});

const getPayment = asyncHandler(async (req, res) => {
  const data = await paymentService.getPaymentForUser(req.params.id, req.user.sub, { role: req.user.role });
  return success(res, {
    data,
    message: 'Payment fetched successfully'
  });
});

const syncPayment = asyncHandler(async (req, res) => {
  const existing = await paymentService.getPaymentForUser(req.params.id, req.user.sub, { role: req.user.role });
  const data = await paymentService.syncNowPaymentsPayment(existing.id);
  return success(res, {
    data,
    message: 'Payment synced successfully'
  });
});

module.exports = {
  createNowPaymentsPayment,
  getPayment,
  syncPayment
};
