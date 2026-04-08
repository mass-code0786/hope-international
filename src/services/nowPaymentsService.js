const crypto = require('crypto');
const env = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const NOWPAYMENTS_PROVIDER = 'nowpayments';
const SUPPORTED_PAY_CURRENCIES = ['btc', 'eth', 'usdttrc20', 'usdtbsc', 'usdterc20', 'ltc'];
const SUCCESS_STATUSES = new Set(['finished', 'confirmed']);

function normalizeCurrency(value, fallback = 'usdtbsc') {
  const normalized = String(value || fallback).trim().toLowerCase();
  if (!SUPPORTED_PAY_CURRENCIES.includes(normalized)) {
    throw new ApiError(400, 'Unsupported crypto currency selected');
  }
  return normalized;
}

function ensureGatewayConfigured() {
  if (!env.nowPaymentsApiKey) {
    throw new ApiError(503, 'NOWPayments gateway is not configured');
  }
}

function ensureWebhookConfigured() {
  if (!env.nowPaymentsIpnSecret) {
    throw new ApiError(503, 'NOWPayments webhook secret is not configured');
  }
}

function buildWebhookUrl() {
  if (env.nowPaymentsWebhookPublicUrl) {
    return env.nowPaymentsWebhookPublicUrl;
  }
  if (env.appBaseUrl) {
    return `${env.appBaseUrl.replace(/\/$/, '')}/api/payments/nowpayments/webhook`;
  }
  return '';
}

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': env.nowPaymentsApiKey
  };
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_error) {
    throw new ApiError(502, 'NOWPayments returned an invalid response');
  }
}

async function createPayment(payload) {
  ensureGatewayConfigured();

  const body = {
    price_amount: Number(payload.priceAmount),
    price_currency: String(payload.priceCurrency || 'usd').trim().toLowerCase(),
    pay_currency: normalizeCurrency(payload.payCurrency),
    order_id: String(payload.orderId),
    order_description: String(payload.orderDescription || 'Hope International deposit').slice(0, 200)
  };

  const webhookUrl = buildWebhookUrl();
  if (webhookUrl) {
    body.ipn_callback_url = webhookUrl;
  }

  const response = await fetch(`${env.nowPaymentsApiBaseUrl.replace(/\/$/, '')}/payment`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body)
  });

  const data = await readJson(response);
  if (!response.ok) {
    throw new ApiError(502, data.message || data.error || 'Failed to create NOWPayments payment');
  }
  if (!data.payment_id || !data.pay_address || !data.pay_amount) {
    throw new ApiError(502, 'NOWPayments payment response is incomplete');
  }

  return data;
}

function verifyWebhookSignature(rawBody, signature) {
  ensureWebhookConfigured();
  const normalizedSignature = String(signature || '').trim().toLowerCase();
  if (!normalizedSignature) {
    return false;
  }

  const expected = crypto
    .createHmac('sha512', env.nowPaymentsIpnSecret)
    .update(rawBody)
    .digest('hex')
    .toLowerCase();

  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(normalizedSignature, 'hex');
  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function isSuccessfulPaymentStatus(status) {
  return SUCCESS_STATUSES.has(String(status || '').trim().toLowerCase());
}

module.exports = {
  NOWPAYMENTS_PROVIDER,
  SUPPORTED_PAY_CURRENCIES,
  createPayment,
  verifyWebhookSignature,
  normalizeCurrency,
  isSuccessfulPaymentStatus
};
