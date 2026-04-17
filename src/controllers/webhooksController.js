const asyncHandler = require('../utils/asyncHandler');
const nowPaymentsService = require('../services/nowPaymentsService');
const paymentService = require('../services/paymentService');
const { ApiError } = require('../utils/ApiError');

function getRawWebhookBody(body) {
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body, 'utf8');
  if (body && typeof body === 'object') return Buffer.from(JSON.stringify(body), 'utf8');
  return Buffer.from('', 'utf8');
}

const nowPaymentsWebhook = asyncHandler(async (req, res) => {
  const rawBody = getRawWebhookBody(req.body);
  const signature = req.headers['x-nowpayments-sig'];
  const signatureValid = nowPaymentsService.verifyWebhookSignature(rawBody, signature);

  console.info('[nowpayments] webhook.received.raw', {
    contentType: req.get('content-type') || null,
    contentLength: rawBody.length,
    hasSignature: Boolean(signature)
  });

  console.info(`[nowpayments] webhook.signature.${signatureValid ? 'passed' : 'failed'}`, {
    contentType: req.get('content-type') || null,
    contentLength: rawBody.length,
    hasSignature: Boolean(signature)
  });

  if (!signatureValid) {
    throw new ApiError(401, 'Invalid NOWPayments signature');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8') || '{}');
  } catch (_error) {
    throw new ApiError(400, 'Invalid webhook payload');
  }

  console.info('[nowpayments] webhook.payload.parsed', {
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
