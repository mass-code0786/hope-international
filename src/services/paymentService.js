const { withTransaction } = require('../db/pool');
const walletRepository = require('../repositories/walletRepository');
const paymentRepository = require('../repositories/paymentRepository');
const walletService = require('./walletService');
const nowPaymentsService = require('./nowPaymentsService');
const { ApiError } = require('../utils/ApiError');

const MIN_DEPOSIT_AMOUNT = 1;

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function toCryptoAmount(value) {
  return Number(Number(value || 0).toFixed(8));
}

function buildDepositOrderId(userId) {
  return `DEP_${String(userId).slice(0, 8).toUpperCase()}_${Date.now()}`;
}

function getFriendlyPaymentStatus(status) {
  const normalized = nowPaymentsService.mapPaymentStatus(status);
  return {
    waiting: 'awaiting_payment',
    partially_paid: 'partially_paid',
    confirming: 'confirming',
    confirmed: 'completed',
    finished: 'completed',
    failed: 'failed',
    expired: 'expired'
  }[normalized] || 'awaiting_payment';
}

function normalizePaymentRecord(record) {
  if (!record) return null;
  return {
    ...record,
    requested_amount: Number(record.requested_amount || record.price_amount || 0),
    expected_amount: record.expected_amount === null || record.expected_amount === undefined ? null : Number(record.expected_amount),
    price_amount: Number(record.price_amount || 0),
    pay_amount: record.pay_amount === null || record.pay_amount === undefined ? null : Number(record.pay_amount),
    actually_paid: Number(record.actually_paid || 0),
    outcome_amount: record.outcome_amount === null || record.outcome_amount === undefined ? null : Number(record.outcome_amount),
    network: record.network || nowPaymentsService.NOWPAYMENTS_DISPLAY_NETWORK,
    pay_currency: nowPaymentsService.NOWPAYMENTS_DISPLAY_CURRENCY,
    payment_address: record.payment_address || record.pay_address || null,
    status_history: Array.isArray(record.status_history) ? record.status_history : [],
    deposit_id: record.deposit_id || null,
    order_id: record.order_id || null,
    user_facing_status: getFriendlyPaymentStatus(record.payment_status),
    is_terminal: ['confirmed', 'finished', 'failed', 'expired'].includes(String(record.payment_status || '').toLowerCase()),
    is_completed: ['confirmed', 'finished'].includes(String(record.payment_status || '').toLowerCase())
  };
}

async function createNowPaymentsDepositPaymentWithClient(client, userId, payload) {
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT_AMOUNT) {
    throw new ApiError(400, `Minimum deposit is ${MIN_DEPOSIT_AMOUNT}`);
  }

  const payCurrency = nowPaymentsService.normalizeCurrency(payload.payCurrency);
  const providerOrderId = buildDepositOrderId(userId);
  const providerPayment = await nowPaymentsService.createPayment({
    priceAmount: amount,
    priceCurrency: 'usd',
    payCurrency,
    orderId: providerOrderId,
    orderDescription: `Hope International deposit for user ${userId}`
  });

  const depositRequest = await walletRepository.createDepositRequest(client, {
    userId,
    asset: 'USDT',
    network: nowPaymentsService.NOWPAYMENTS_DISPLAY_NETWORK,
    walletAddressSnapshot: providerPayment.pay_address || null,
    amount,
    method: 'nowpayments',
    instructions: 'Waiting for NOWPayments confirmation.',
    paymentProvider: nowPaymentsService.NOWPAYMENTS_PROVIDER,
    paymentId: String(providerPayment.payment_id),
    orderId: providerOrderId,
    paymentStatus: nowPaymentsService.mapPaymentStatus(providerPayment.payment_status || 'waiting'),
    payCurrency: nowPaymentsService.NOWPAYMENTS_DISPLAY_CURRENCY,
    payAmount: toCryptoAmount(providerPayment.pay_amount || 0),
    payAddress: providerPayment.pay_address || null,
    paymentUrl: providerPayment.payment_url || providerPayment.invoice_url || null,
    isProcessed: false,
    rawWebhookData: providerPayment,
    details: {
      provider: nowPaymentsService.NOWPAYMENTS_PROVIDER,
      priceAmount: toMoney(amount),
      priceCurrency: 'USD',
      network: nowPaymentsService.NOWPAYMENTS_DISPLAY_NETWORK,
      payCurrency: nowPaymentsService.NOWPAYMENTS_DISPLAY_CURRENCY,
      payAmount: toCryptoAmount(providerPayment.pay_amount || 0),
      payAddress: providerPayment.pay_address || null,
      providerPaymentId: providerPayment.payment_id || null,
      paymentStatus: nowPaymentsService.mapPaymentStatus(providerPayment.payment_status || 'waiting')
    },
    status: 'pending'
  });

  const paymentRecord = await paymentRepository.createNowPaymentsPayment(client, {
    userId,
    depositId: depositRequest.id,
    providerPaymentId: String(providerPayment.payment_id || ''),
    providerOrderId,
    network: nowPaymentsService.NOWPAYMENTS_DISPLAY_NETWORK,
    requestedAmount: toMoney(amount),
    expectedAmount: toCryptoAmount(providerPayment.pay_amount || 0),
    priceAmount: toMoney(amount),
    priceCurrency: 'usd',
    payCurrency: nowPaymentsService.NOWPAYMENTS_DISPLAY_CURRENCY,
    payAmount: toCryptoAmount(providerPayment.pay_amount || 0),
    paymentAddress: providerPayment.pay_address || null,
    payAddress: providerPayment.pay_address || null,
    paymentStatus: nowPaymentsService.mapPaymentStatus(providerPayment.payment_status || 'waiting'),
    actuallyPaid: toCryptoAmount(providerPayment.actually_paid || 0),
    outcomeAmount: providerPayment.outcome_amount === undefined ? null : toCryptoAmount(providerPayment.outcome_amount),
    outcomeCurrency: providerPayment.outcome_currency || null,
    paymentUrl: providerPayment.payment_url || providerPayment.invoice_url || null,
    ipnCallbackUrl: nowPaymentsService.buildWebhookUrl(),
    expiresAt: providerPayment.expiration_estimate_date || null,
    statusHistory: [{
      status: nowPaymentsService.mapPaymentStatus(providerPayment.payment_status || 'waiting'),
      source: 'create',
      recordedAt: new Date().toISOString()
    }],
    rawPayload: providerPayment
  });

  await walletRepository.updateDepositRequestStatus(client, depositRequest.id, {
    status: depositRequest.status,
    details: {
      paymentRecordId: paymentRecord.id,
      providerOrderId,
      providerPaymentId: paymentRecord.provider_payment_id
    },
    paymentProvider: nowPaymentsService.NOWPAYMENTS_PROVIDER,
    paymentId: paymentRecord.provider_payment_id,
    orderId: providerOrderId,
    paymentStatus: paymentRecord.payment_status,
      payCurrency: paymentRecord.pay_currency,
      payAmount: paymentRecord.pay_amount,
      payAddress: paymentRecord.pay_address,
    paymentUrl: paymentRecord.payment_url,
    rawWebhookData: providerPayment,
    expectedCurrentStatus: depositRequest.status
  });

  return {
    depositRequest: {
      ...depositRequest,
      details: {
        ...(depositRequest.details || {}),
        paymentRecordId: paymentRecord.id,
        providerOrderId,
        providerPaymentId: paymentRecord.provider_payment_id
      }
    },
    payment: normalizePaymentRecord(paymentRecord)
  };
}

async function createNowPaymentsDepositPayment(userId, payload) {
  return withTransaction((client) => createNowPaymentsDepositPaymentWithClient(client, userId, payload));
}

async function processNowPaymentsPayloadWithClient(client, payload, options = {}) {
  const providerPaymentId = payload.payment_id ? String(payload.payment_id) : null;
  const providerOrderId = payload.order_id ? String(payload.order_id) : null;
  if (payload.pay_currency && !['usdt', 'usdtbsc'].includes(String(payload.pay_currency).trim().toLowerCase())) {
    throw new ApiError(400, 'NOWPayments deposits support only USDT on BSC/BEP20');
  }
  const paymentRecord = providerPaymentId
    ? await paymentRepository.getNowPaymentsPaymentByProviderPaymentId(client, providerPaymentId, { forUpdate: true })
    : await paymentRepository.getNowPaymentsPaymentByProviderOrderId(client, providerOrderId, { forUpdate: true });

  if (!paymentRecord) {
    throw new ApiError(404, 'NOWPayments payment not found');
  }

  const depositRequest = paymentRecord.deposit_id
    ? await walletRepository.getDepositRequestById(client, paymentRecord.deposit_id, { forUpdate: true })
    : null;

  const mappedStatus = nowPaymentsService.mapPaymentStatus(payload.payment_status || paymentRecord.payment_status);
  const statusHistory = Array.isArray(paymentRecord.status_history) ? [...paymentRecord.status_history] : [];
  statusHistory.push({
    status: mappedStatus,
    source: options.source || 'webhook',
    recordedAt: new Date().toISOString()
  });
  const nextPaymentRecord = await paymentRepository.updateNowPaymentsPayment(client, paymentRecord.id, {
    providerPaymentId: providerPaymentId || paymentRecord.provider_payment_id,
    providerOrderId: providerOrderId || paymentRecord.provider_order_id,
    network: paymentRecord.network || nowPaymentsService.NOWPAYMENTS_DISPLAY_NETWORK,
    requestedAmount: paymentRecord.requested_amount || paymentRecord.price_amount,
    expectedAmount: payload.pay_amount === undefined ? paymentRecord.expected_amount : toCryptoAmount(payload.pay_amount || 0),
    payCurrency: nowPaymentsService.NOWPAYMENTS_DISPLAY_CURRENCY,
    payAmount: payload.pay_amount === undefined ? paymentRecord.pay_amount : toCryptoAmount(payload.pay_amount || 0),
    paymentAddress: payload.pay_address || paymentRecord.payment_address || paymentRecord.pay_address,
    payAddress: payload.pay_address || paymentRecord.pay_address,
    paymentStatus: mappedStatus,
    actuallyPaid: payload.actually_paid === undefined ? paymentRecord.actually_paid : toCryptoAmount(payload.actually_paid || 0),
    outcomeAmount: payload.outcome_amount === undefined ? paymentRecord.outcome_amount : toCryptoAmount(payload.outcome_amount || 0),
    outcomeCurrency: payload.outcome_currency || paymentRecord.outcome_currency,
    paymentUrl: payload.invoice_url || payload.payment_url || paymentRecord.payment_url,
    expiresAt: payload.expiration_estimate_date || paymentRecord.expires_at,
    statusHistory,
    rawPayload: payload
  });

  if (depositRequest) {
    const expectedAmount = toMoney(depositRequest.amount || 0);
    const payloadPriceAmount = payload.price_amount === undefined ? expectedAmount : toMoney(payload.price_amount || 0);
    if (Math.abs(expectedAmount - payloadPriceAmount) > 0.01) {
      throw new ApiError(400, 'NOWPayments amount mismatch');
    }

    const nextDepositStatus = ['failed', 'expired'].includes(mappedStatus)
      ? 'failed'
      : nowPaymentsService.isSuccessfulPaymentStatus(mappedStatus)
        ? 'approved'
        : depositRequest.status;

    await walletRepository.updateDepositRequestStatus(client, depositRequest.id, {
      status: nextDepositStatus,
      details: {
        paymentRecordId: nextPaymentRecord.id,
        providerOrderId: nextPaymentRecord.provider_order_id,
        providerPaymentId: nextPaymentRecord.provider_payment_id,
        webhookReceivedAt: new Date().toISOString(),
        webhookSource: options.source || 'webhook'
      },
      paymentProvider: nowPaymentsService.NOWPAYMENTS_PROVIDER,
      paymentId: nextPaymentRecord.provider_payment_id,
      orderId: nextPaymentRecord.provider_order_id,
      paymentStatus: mappedStatus,
      payCurrency: nextPaymentRecord.pay_currency,
      payAmount: nextPaymentRecord.pay_amount,
      payAddress: nextPaymentRecord.pay_address,
      paymentUrl: nextPaymentRecord.payment_url,
      rawWebhookData: payload,
      expectedCurrentStatus: depositRequest.status
    });

    if (nowPaymentsService.isSuccessfulPaymentStatus(mappedStatus)) {
      await walletService.settleDepositRequest(client, depositRequest, {
        status: 'approved',
        expectedCurrentStatus: nextDepositStatus,
        paymentStatus: mappedStatus,
        rawWebhookData: payload,
        extraDetails: {
          paymentRecordId: nextPaymentRecord.id,
          confirmedBy: nowPaymentsService.NOWPAYMENTS_PROVIDER,
          confirmedAt: new Date().toISOString()
        }
      });

      await paymentRepository.updateNowPaymentsPayment(client, nextPaymentRecord.id, {
        isCredited: true,
        creditedAt: nextPaymentRecord.credited_at || new Date().toISOString(),
        rawPayload: payload
      });
    }
  }

  return normalizePaymentRecord(await paymentRepository.getNowPaymentsPaymentById(client, paymentRecord.id));
}

async function processNowPaymentsPayload(payload, options = {}) {
  return withTransaction((client) => processNowPaymentsPayloadWithClient(client, payload, options));
}

async function syncNowPaymentsPaymentWithClient(client, paymentId) {
  const paymentRecord = await paymentRepository.getNowPaymentsPaymentById(client, paymentId, { forUpdate: true });
  if (!paymentRecord) {
    throw new ApiError(404, 'Payment not found');
  }
  const providerPaymentId = paymentRecord.provider_payment_id;
  if (!providerPaymentId) {
    throw new ApiError(400, 'Provider payment id is missing');
  }
  const providerPayload = await nowPaymentsService.getPaymentStatus(providerPaymentId);
  return processNowPaymentsPayloadWithClient(client, providerPayload, { source: 'sync' });
}

async function syncNowPaymentsPayment(paymentId) {
  return withTransaction((client) => syncNowPaymentsPaymentWithClient(client, paymentId));
}

async function getPaymentForUser(paymentId, userId, options = {}) {
  const paymentRecord = await paymentRepository.getNowPaymentsPaymentById(null, paymentId);
  if (!paymentRecord) {
    throw new ApiError(404, 'Payment not found');
  }
  const isAdmin = ['admin', 'super_admin'].includes(String(options.role || '').toLowerCase());
  if (!isAdmin && String(paymentRecord.user_id) !== String(userId)) {
    throw new ApiError(404, 'Payment not found');
  }
  return normalizePaymentRecord(paymentRecord);
}

async function listAdminNowPaymentsPayments(filters, pagination) {
  const result = await paymentRepository.listNowPaymentsPaymentsAdmin(null, filters, pagination);
  return {
    items: result.items.map(normalizePaymentRecord),
    total: result.total
  };
}

module.exports = {
  createNowPaymentsDepositPayment,
  createNowPaymentsDepositPaymentWithClient,
  processNowPaymentsPayload,
  processNowPaymentsPayloadWithClient,
  syncNowPaymentsPayment,
  syncNowPaymentsPaymentWithClient,
  getPaymentForUser,
  listAdminNowPaymentsPayments,
  normalizePaymentRecord
};
