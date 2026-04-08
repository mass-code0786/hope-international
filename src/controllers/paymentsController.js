const asyncHandler = require('../utils/asyncHandler');
const { withTransaction } = require('../db/pool');
const walletRepository = require('../repositories/walletRepository');
const walletService = require('../services/walletService');
const nowPaymentsService = require('../services/nowPaymentsService');
const { ApiError } = require('../utils/ApiError');

const nowPaymentsWebhook = asyncHandler(async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const signature = req.headers['x-nowpayments-sig'];

  if (!nowPaymentsService.verifyWebhookSignature(rawBody, signature)) {
    throw new ApiError(401, 'Invalid NOWPayments signature');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8') || '{}');
  } catch (_error) {
    throw new ApiError(400, 'Invalid webhook payload');
  }

  await withTransaction(async (client) => {
    const paymentId = payload.payment_id ? String(payload.payment_id) : null;
    const orderId = payload.order_id ? String(payload.order_id) : null;

    let request = paymentId
      ? await walletRepository.getDepositRequestByPaymentId(client, paymentId, { forUpdate: true })
      : null;

    if (!request && orderId) {
      request = await walletRepository.getDepositRequestByOrderId(client, orderId, { forUpdate: true });
    }

    if (!request) {
      throw new ApiError(404, 'Deposit request not found');
    }

    const webhookDetails = {
      lastWebhookAt: new Date().toISOString(),
      webhookPaymentStatus: payload.payment_status || null
    };

    const updated = await walletRepository.updateDepositRequestStatus(client, request.id, {
      status: request.status,
      details: webhookDetails,
      paymentProvider: nowPaymentsService.NOWPAYMENTS_PROVIDER,
      paymentId: paymentId || request.payment_id || null,
      orderId: orderId || request.order_id || null,
      paymentStatus: payload.payment_status || request.payment_status || null,
      payCurrency: payload.pay_currency || request.pay_currency || null,
      payAmount: payload.pay_amount === undefined ? request.pay_amount : Number(payload.pay_amount || 0),
      payAddress: payload.pay_address || request.pay_address || null,
      paymentUrl: payload.invoice_url || request.payment_url || null,
      rawWebhookData: payload
    });

    const expectedAmount = Number(request.amount || 0);
    const paidPriceAmount = Number(payload.price_amount || 0);
    if (Number.isFinite(paidPriceAmount) && paidPriceAmount > 0 && Math.abs(expectedAmount - paidPriceAmount) > 0.01) {
      throw new ApiError(400, 'Webhook amount mismatch');
    }

    if (nowPaymentsService.isSuccessfulPaymentStatus(payload.payment_status)) {
      await walletService.settleDepositRequest(client, updated || request, {
        status: 'approved',
        expectedCurrentStatus: request.status,
        paymentStatus: payload.payment_status,
        rawWebhookData: payload,
        extraDetails: {
          confirmedBy: nowPaymentsService.NOWPAYMENTS_PROVIDER,
          confirmedAt: new Date().toISOString()
        }
      });
    }
  });

  res.status(200).json({ success: true });
});

module.exports = {
  nowPaymentsWebhook
};
