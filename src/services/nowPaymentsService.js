const crypto = require('crypto');
const env = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const NOWPAYMENTS_PROVIDER = 'nowpayments';
const NOWPAYMENTS_PAY_CURRENCY = 'usdtbsc';
const NOWPAYMENTS_DISPLAY_CURRENCY = 'USDT';
const NOWPAYMENTS_DISPLAY_NETWORK = 'BSC/BEP20';
const SUPPORTED_PAY_CURRENCIES = [NOWPAYMENTS_PAY_CURRENCY];
const SUPPORTED_NETWORK_ALIASES = new Set(['bsc', 'bep20', 'bsc/bep20']);
const SUCCESS_STATUSES = new Set(['finished', 'confirmed']);
const FAILED_STATUSES = new Set(['failed', 'expired', 'refunded']);

function buildApiUrl(pathname) {
  const base = String(env.nowPaymentsBaseUrl || 'https://api.nowpayments.io').replace(/\/$/, '');
  const versionedBase = /\/v\d+$/i.test(base) ? base : `${base}/v1`;
  return `${versionedBase}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function normalizeCurrency(value, fallback = NOWPAYMENTS_PAY_CURRENCY) {
  const normalized = String(value || fallback).trim().toLowerCase();
  if (!normalized || ['usdt', NOWPAYMENTS_PAY_CURRENCY].includes(normalized) === false) {
    throw new ApiError(400, 'NOWPayments deposits support only USDT on BSC/BEP20');
  }
  return NOWPAYMENTS_PAY_CURRENCY;
}

function normalizeNetwork(value, fallback = NOWPAYMENTS_DISPLAY_NETWORK) {
  const normalized = String(value || fallback).trim().toLowerCase();
  if (!SUPPORTED_NETWORK_ALIASES.has(normalized)) {
    throw new ApiError(400, 'NOWPayments deposits support only USDT on BSC/BEP20');
  }
  return NOWPAYMENTS_DISPLAY_NETWORK;
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
    return `${env.appBaseUrl.replace(/\/$/, '')}/api/webhooks/nowpayments`;
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

  const response = await fetch(buildApiUrl('/payment'), {
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

async function getPaymentStatus(paymentId) {
  ensureGatewayConfigured();
  const response = await fetch(buildApiUrl(`/payment/${encodeURIComponent(paymentId)}`), {
    method: 'GET',
    headers: buildHeaders()
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new ApiError(502, data.message || data.error || 'Failed to fetch NOWPayments payment status');
  }
  return data;
}

function mapPaymentStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return 'waiting';
  if (SUCCESS_STATUSES.has(normalized)) return normalized;
  if (normalized === 'sending' || normalized === 'confirming') return 'confirming';
  if (normalized === 'partially_paid') return 'partially_paid';
  if (FAILED_STATUSES.has(normalized)) {
    return normalized === 'expired' ? 'expired' : 'failed';
  }
  return 'waiting';
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

function isFailedPaymentStatus(status) {
  return FAILED_STATUSES.has(String(status || '').trim().toLowerCase());
}

module.exports = {
  NOWPAYMENTS_PROVIDER,
  NOWPAYMENTS_PAY_CURRENCY,
  NOWPAYMENTS_DISPLAY_CURRENCY,
  NOWPAYMENTS_DISPLAY_NETWORK,
  SUPPORTED_PAY_CURRENCIES,
  createPayment,
  getPaymentStatus,
  verifyWebhookSignature,
  normalizeCurrency,
  normalizeNetwork,
  mapPaymentStatus,
  isSuccessfulPaymentStatus,
  isFailedPaymentStatus,
  buildWebhookUrl
};
