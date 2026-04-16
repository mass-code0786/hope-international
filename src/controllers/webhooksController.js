const asyncHandler = require('../utils/asyncHandler');
const nowPaymentsService = require('../services/nowPaymentsService');
const paymentService = require('../services/paymentService');
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

  console.info('[nowpayments] webhook.received.raw', {
    providerPaymentId: payload?.payment_id ? String(payload.payment_id) : null,
    providerOrderId: payload?.order_id ? String(payload.order_id) : null,
    paymentStatus: payload?.payment_status || null
  });

  await paymentService.processNowPaymentsPayload(payload, { source: 'webhook' });
  res.status(200).json({ success: true });
});

module.exports = {
  nowPaymentsWebhook
};
