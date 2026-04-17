const { withTransaction } = require('../db/pool');
const walletRepository = require('../repositories/walletRepository');
const paymentRepository = require('../repositories/paymentRepository');
const walletService = require('./walletService');
const nowPaymentsService = require('./nowPaymentsService');
const { ApiError } = require('../utils/ApiError');

const MIN_DEPOSIT_AMOUNT = 1;
const MAX_DEPOSIT_AMOUNT = 1000;
const PAYMENT_EXPIRY_MINUTES = 30;
const AUTO_SYNCABLE_PAYMENT_STATUSES = new Set(['waiting', 'confirming', 'partially_paid']);
const AUTO_SYNC_MIN_INTERVAL_MS = 15_000;

function logNowPayments(event, payload = {}) {
  console.info(`[nowpayments] ${event}`, payload);
}

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function toCryptoAmount(value) {
  return Number(Number(value || 0).toFixed(8));
}

function buildDepositOrderId(userId) {
  return `DEP_${String(userId).slice(0, 8).toUpperCase()}_${Date.now()}`;
}

function computeDepositFee(amount) {
  const normalizedAmount = toMoney(amount);
  if (normalizedAmount >= 1 && normalizedAmount <= 50) return 0.5;
  if (normalizedAmount >= 51 && normalizedAmount <= 1000) return 1;
  throw new ApiError(400, 'Deposit amount must be between 1 and 1000 USD');
}

function buildLocalExpiryDate(fromDate = new Date()) {
  return new Date(fromDate.getTime() + PAYMENT_EXPIRY_MINUTES * 60 * 1000);
}

function resolveExpiresAt(providerValue, fallbackDate) {
  if (!providerValue) return fallbackDate.toISOString();
  const providerDate = new Date(providerValue);
  if (Number.isNaN(providerDate.getTime())) return fallbackDate.toISOString();
  return providerDate.getTime() < fallbackDate.getTime() ? providerDate.toISOString() : fallbackDate.toISOString();
}

function isExpiredAt(expiresAt) {
  if (!expiresAt) return false;
  const timestamp = new Date(expiresAt).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

function getFriendlyPaymentStatus(status) {
  const normalized = nowPaymentsService.mapPaymentStatus(status);
  return {
    waiting: 'awaiting_payment',
    partially_paid: 'partially_paid',
    confirming: 'confirming',
    confirmed: 'confirmed',
    finished: 'finished',
    failed: 'failed',
    expired: 'expired'
  }[normalized] || 'awaiting_payment';
}

function shouldAttemptAutoSync(paymentRecord, options = {}) {
  if (!paymentRecord) return false;
  if (!paymentRecord.provider_payment_id) return false;
  if (options.force === true) return true;

  const status = String(paymentRecord.payment_status || '').trim().toLowerCase();
  if (!AUTO_SYNCABLE_PAYMENT_STATUSES.has(status)) return false;
  if (isExpiredAt(paymentRecord.expires_at)) return false;

  const lastUpdatedAt = new Date(paymentRecord.updated_at || paymentRecord.created_at || 0).getTime();
  if (!Number.isFinite(lastUpdatedAt)) return true;
  return (Date.now() - lastUpdatedAt) >= AUTO_SYNC_MIN_INTERVAL_MS;
}

async function resolveNowPaymentsPaymentRecord(client, lookupId, options = {}) {
  if (!lookupId) return null;

  const direct = await paymentRepository.getNowPaymentsPaymentById(client, lookupId, options);
  if (direct) {
    return direct;
  }

  const byDepositId = await paymentRepository.getNowPaymentsPaymentByDepositId(client, lookupId, options);
  if (byDepositId) {
    return byDepositId;
  }

  const depositRequest = await walletRepository.getDepositRequestById(client, lookupId, options);
  if (!depositRequest) {
    return null;
  }

  const details = depositRequest.details && typeof depositRequest.details === 'object' && !Array.isArray(depositRequest.details)
    ? depositRequest.details
    : {};

  if (details.paymentRecordId) {
    const byDetailsId = await paymentRepository.getNowPaymentsPaymentById(client, details.paymentRecordId, options);
    if (byDetailsId) return byDetailsId;
  }

  if (depositRequest.payment_id) {
    const byProviderPaymentId = await paymentRepository.getNowPaymentsPaymentByProviderPaymentId(client, String(depositRequest.payment_id), options);
    if (byProviderPaymentId) return byProviderPaymentId;
  }

  if (depositRequest.order_id) {
    const byProviderOrderId = await paymentRepository.getNowPaymentsPaymentByProviderOrderId(client, String(depositRequest.order_id), options);
    if (byProviderOrderId) return byProviderOrderId;
  }

  return await paymentRepository.getNowPaymentsPaymentByDepositId(client, depositRequest.id, options);
}

function normalizePaymentRecord(record, options = {}) {
  if (!record) return null;
  const includeSensitive = options.includeSensitive === true;
  const requestedAmount = Number(record.requested_amount || 0);
  const totalPayableAmount = Number(record.price_amount || 0);
  const feeAmount = Math.max(0, Number((totalPayableAmount - requestedAmount).toFixed(2)));
  const locallyExpired = !['confirmed', 'finished', 'failed', 'expired'].includes(String(record.payment_status || '').toLowerCase())
    && isExpiredAt(record.expires_at);
  const effectivePaymentStatus = locallyExpired ? 'expired' : record.payment_status;
  const normalized = {
    ...record,
    requested_amount: requestedAmount,
    expected_amount: record.expected_amount === null || record.expected_amount === undefined ? null : Number(record.expected_amount),
    price_amount: totalPayableAmount,
    deposit_amount: requestedAmount,
    fee_amount: feeAmount,
    total_payable_amount: totalPayableAmount,
    pay_amount: record.pay_amount === null || record.pay_amount === undefined ? null : Number(record.pay_amount),
    actually_paid: Number(record.actually_paid || 0),
    outcome_amount: record.outcome_amount === null || record.outcome_amount === undefined ? null : Number(record.outcome_amount),
    network: record.network || nowPaymentsService.NOWPAYMENTS_DISPLAY_NETWORK,
    pay_currency: nowPaymentsService.NOWPAYMENTS_DISPLAY_CURRENCY,
    payment_address: record.payment_address || record.pay_address || null,
    status_history: Array.isArray(record.status_history) ? record.status_history : [],
    deposit_id: record.deposit_id || null,
    order_id: record.order_id || null,
    payment_status: effectivePaymentStatus,
    user_facing_status: getFriendlyPaymentStatus(effectivePaymentStatus),
    is_terminal: ['confirmed', 'finished', 'failed', 'expired'].includes(String(effectivePaymentStatus || '').toLowerCase()),
    is_completed: ['confirmed', 'finished'].includes(String(effectivePaymentStatus || '').toLowerCase()),
    is_expired: locallyExpired || String(record.payment_status || '').toLowerCase() === 'expired'
  };

  if (!includeSensitive) {
    delete normalized.raw_payload;
    delete normalized.status_history;
  }

  return normalized;
}

async function reconcileSuccessfulDepositCreditWithClient(client, paymentRecord, depositRequest, payload, options = {}) {
  if (!paymentRecord || !depositRequest) {
    throw new ApiError(404, 'NOWPayments deposit mapping is incomplete');
  }

  if (String(paymentRecord.user_id) !== String(depositRequest.user_id)) {
    throw new ApiError(500, 'NOWPayments payment user mapping mismatch');
  }

  const existingCredit = await walletRepository.getTransactionBySourceAndReference(
    client,
    depositRequest.user_id,
    'deposit_request',
    depositRequest.id
  );
  const alreadyApplied = Boolean(depositRequest.is_processed || paymentRecord.is_credited || paymentRecord.wallet_credit_applied);

  logNowPayments('wallet-credit.reconcile', {
    paymentRecordId: paymentRecord.id,
    depositId: depositRequest.id,
    userId: depositRequest.user_id,
    providerPaymentId: paymentRecord.provider_payment_id,
    paymentStatus: options.paymentStatus || paymentRecord.payment_status || null,
    alreadyCredited: Boolean(existingCredit),
    alreadyApplied
  });

  const creditedAt = paymentRecord.credited_at || existingCredit?.created_at || depositRequest.processed_at || new Date().toISOString();
  let settled = null;

  if (alreadyApplied) {
    logNowPayments('wallet-credit.duplicate-prevented', {
      paymentRecordId: paymentRecord.id,
      depositId: depositRequest.id,
      userId: depositRequest.user_id,
      providerPaymentId: paymentRecord.provider_payment_id,
      paymentStatus: options.paymentStatus || paymentRecord.payment_status || null,
      paymentAlreadyMarkedCredited: Boolean(paymentRecord.is_credited || paymentRecord.wallet_credit_applied),
      depositAlreadyProcessed: Boolean(depositRequest.is_processed)
    });
  } else {
    settled = await walletService.settleDepositRequest(client, depositRequest.id, {
      status: 'approved',
      paymentStatus: options.paymentStatus || paymentRecord.payment_status || null,
      rawWebhookData: payload,
      extraDetails: {
        paymentRecordId: paymentRecord.id,
        confirmedBy: nowPaymentsService.NOWPAYMENTS_PROVIDER,
        confirmedAt: creditedAt,
        creditedAt,
        walletCreditApplied: true
      }
    });
  }

  const latestPaymentRecord = await paymentRepository.updateNowPaymentsPayment(client, paymentRecord.id, {
    isCredited: true,
    walletCreditApplied: true,
    creditedAt,
    rawPayload: payload
  });

  logNowPayments('wallet-credit.applied', {
    paymentRecordId: paymentRecord.id,
    depositId: depositRequest.id,
    userId: depositRequest.user_id,
    providerPaymentId: paymentRecord.provider_payment_id,
    creditedAt,
    alreadyCredited: Boolean(existingCredit || alreadyApplied || settled?.alreadyProcessed)
  });

  return {
    paymentRecord: latestPaymentRecord || paymentRecord,
    alreadyCredited: Boolean(existingCredit || alreadyApplied || settled?.alreadyProcessed)
  };
}

async function createNowPaymentsDepositPaymentWithClient(client, userId, payload) {
  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount < MIN_DEPOSIT_AMOUNT) {
    throw new ApiError(400, `Minimum deposit is ${MIN_DEPOSIT_AMOUNT}`);
  }
  if (amount > MAX_DEPOSIT_AMOUNT) {
    throw new ApiError(400, `Maximum deposit is ${MAX_DEPOSIT_AMOUNT}`);
  }

  const depositAmount = toMoney(amount);
  const feeAmount = computeDepositFee(depositAmount);
  const totalPayableAmount = toMoney(depositAmount + feeAmount);
  const payCurrency = nowPaymentsService.normalizeCurrency(payload.payCurrency);
  const network = nowPaymentsService.normalizeNetwork(payload.network);
  const providerOrderId = buildDepositOrderId(userId);
  const providerPayment = await nowPaymentsService.createPayment({
    priceAmount: totalPayableAmount,
    priceCurrency: 'usd',
    payCurrency,
    orderId: providerOrderId,
    orderDescription: `Hope International deposit for user ${userId}`
  });
  const localExpiresAt = buildLocalExpiryDate();
  const expiresAt = resolveExpiresAt(providerPayment.expiration_estimate_date, localExpiresAt);

  const depositRequest = await walletRepository.createDepositRequest(client, {
    userId,
    asset: 'USDT',
    network,
    walletAddressSnapshot: providerPayment.pay_address || null,
    amount: depositAmount,
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
      depositAmount,
      feeAmount,
      totalPayableAmount,
      priceAmount: totalPayableAmount,
      priceCurrency: 'USD',
      network,
      payCurrency: nowPaymentsService.NOWPAYMENTS_DISPLAY_CURRENCY,
      payAmount: toCryptoAmount(providerPayment.pay_amount || 0),
      payAddress: providerPayment.pay_address || null,
      providerPaymentId: providerPayment.payment_id || null,
      paymentStatus: nowPaymentsService.mapPaymentStatus(providerPayment.payment_status || 'waiting'),
      expiresAt
    },
    status: 'pending'
  });

  const paymentRecord = await paymentRepository.createNowPaymentsPayment(client, {
    userId,
    depositId: depositRequest.id,
    providerPaymentId: String(providerPayment.payment_id || ''),
    providerOrderId,
    network,
    requestedAmount: depositAmount,
    expectedAmount: toCryptoAmount(providerPayment.pay_amount || 0),
    priceAmount: totalPayableAmount,
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
    expiresAt,
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

  logNowPayments('payment.created', {
    paymentRecordId: paymentRecord.id,
    depositId: depositRequest.id,
    userId,
    providerPaymentId: paymentRecord.provider_payment_id,
    providerOrderId,
    webhookUrl: paymentRecord.ipn_callback_url || nowPaymentsService.buildWebhookUrl() || null,
    requestedAmount: depositAmount,
    feeAmount,
    totalPayableAmount,
    paymentStatus: paymentRecord.payment_status,
    expiresAt
  });

  return {
    depositRequest: {
      ...depositRequest,
      details: {
        ...(depositRequest.details || {}),
        paymentRecordId: paymentRecord.id,
        providerOrderId,
        providerPaymentId: paymentRecord.provider_payment_id,
        feeAmount,
        totalPayableAmount,
        expiresAt
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
  let paymentRecord = providerPaymentId
    ? await paymentRepository.getNowPaymentsPaymentByProviderPaymentId(client, providerPaymentId, { forUpdate: true })
    : await paymentRepository.getNowPaymentsPaymentByProviderOrderId(client, providerOrderId, { forUpdate: true });

  if (!paymentRecord && providerOrderId) {
    const depositByOrderId = await walletRepository.getDepositRequestByOrderId(client, providerOrderId, { forUpdate: true });
    if (depositByOrderId) {
      paymentRecord = await resolveNowPaymentsPaymentRecord(client, depositByOrderId.id, { forUpdate: true });
    }
  }

  if (!paymentRecord && providerPaymentId) {
    const depositByPaymentId = await walletRepository.getDepositRequestByPaymentId(client, providerPaymentId, { forUpdate: true });
    if (depositByPaymentId) {
      paymentRecord = await resolveNowPaymentsPaymentRecord(client, depositByPaymentId.id, { forUpdate: true });
    }
  }

  if (!paymentRecord) {
    logNowPayments('webhook.lookup-miss', {
      source: options.source || 'webhook',
      providerPaymentId,
      providerOrderId,
      paymentStatus: payload.payment_status || null
    });
    throw new ApiError(404, 'NOWPayments payment not found');
  }

  const depositRequest = paymentRecord.deposit_id
    ? await walletRepository.getDepositRequestById(client, paymentRecord.deposit_id, { forUpdate: true })
    : null;
  const previousPaymentStatus = String(paymentRecord.payment_status || '').trim().toLowerCase() || null;
  const previousDepositStatus = depositRequest?.status || null;

  logNowPayments('webhook.received', {
    source: options.source || 'webhook',
    paymentRecordId: paymentRecord.id,
    depositId: paymentRecord.deposit_id || null,
    userId: paymentRecord.user_id,
    providerPaymentId: providerPaymentId || paymentRecord.provider_payment_id,
    providerOrderId: providerOrderId || paymentRecord.provider_order_id,
    incomingStatus: payload.payment_status || null
  });
  logNowPayments('payment-record.found', {
    source: options.source || 'webhook',
    paymentRecordId: paymentRecord.id,
    depositId: paymentRecord.deposit_id || null,
    userId: paymentRecord.user_id,
    providerPaymentId: providerPaymentId || paymentRecord.provider_payment_id,
    providerOrderId: providerOrderId || paymentRecord.provider_order_id
  });

  const mappedStatus = nowPaymentsService.mapPaymentStatus(payload.payment_status || paymentRecord.payment_status);
  const expiresAt = resolveExpiresAt(payload.expiration_estimate_date || paymentRecord.expires_at, buildLocalExpiryDate(new Date(paymentRecord.created_at || Date.now())));
  const effectiveMappedStatus = ['confirmed', 'finished', 'failed', 'expired'].includes(mappedStatus)
    ? mappedStatus
    : (isExpiredAt(expiresAt) ? 'expired' : mappedStatus);
  const statusHistory = Array.isArray(paymentRecord.status_history) ? [...paymentRecord.status_history] : [];
  statusHistory.push({
    status: effectiveMappedStatus,
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
    paymentStatus: effectiveMappedStatus,
    actuallyPaid: payload.actually_paid === undefined ? paymentRecord.actually_paid : toCryptoAmount(payload.actually_paid || 0),
    outcomeAmount: payload.outcome_amount === undefined ? paymentRecord.outcome_amount : toCryptoAmount(payload.outcome_amount || 0),
    outcomeCurrency: payload.outcome_currency || paymentRecord.outcome_currency,
    paymentUrl: payload.invoice_url || payload.payment_url || paymentRecord.payment_url,
    expiresAt,
    statusHistory,
    rawPayload: payload
  });

  logNowPayments('payment.status-updated', {
    source: options.source || 'webhook',
    paymentRecordId: nextPaymentRecord.id,
    depositId: nextPaymentRecord.deposit_id,
    userId: nextPaymentRecord.user_id,
    providerPaymentId: nextPaymentRecord.provider_payment_id,
    providerOrderId: nextPaymentRecord.provider_order_id,
    previousPaymentStatus,
    paymentStatus: effectiveMappedStatus,
    expiresAt
  });

  if (depositRequest) {
    if (String(paymentRecord.user_id) !== String(depositRequest.user_id)) {
      throw new ApiError(500, 'NOWPayments deposit owner mapping mismatch');
    }

    const expectedAmount = toMoney(paymentRecord.price_amount || 0);
    const payloadPriceAmount = payload.price_amount === undefined ? expectedAmount : toMoney(payload.price_amount || 0);
    if (Math.abs(expectedAmount - payloadPriceAmount) > 0.01) {
      throw new ApiError(400, 'NOWPayments amount mismatch');
    }

    const nextDepositStatus = ['failed', 'expired'].includes(effectiveMappedStatus)
      ? 'failed'
      : nowPaymentsService.isSuccessfulPaymentStatus(effectiveMappedStatus)
        ? 'approved'
        : depositRequest.status;

    const nextDepositRequest = await walletRepository.updateDepositRequestStatus(client, depositRequest.id, {
      status: nextDepositStatus,
      details: {
        paymentRecordId: nextPaymentRecord.id,
        providerOrderId: nextPaymentRecord.provider_order_id,
        providerPaymentId: nextPaymentRecord.provider_payment_id,
        webhookReceivedAt: new Date().toISOString(),
        webhookSource: options.source || 'webhook',
        feeAmount: Math.max(0, Number((Number(nextPaymentRecord.price_amount || 0) - Number(nextPaymentRecord.requested_amount || 0)).toFixed(2))),
        totalPayableAmount: Number(nextPaymentRecord.price_amount || 0),
        expiresAt
      },
      paymentProvider: nowPaymentsService.NOWPAYMENTS_PROVIDER,
      paymentId: nextPaymentRecord.provider_payment_id,
      orderId: nextPaymentRecord.provider_order_id,
      paymentStatus: effectiveMappedStatus,
      payCurrency: nextPaymentRecord.pay_currency,
      payAmount: nextPaymentRecord.pay_amount,
      payAddress: nextPaymentRecord.pay_address,
      paymentUrl: nextPaymentRecord.payment_url,
      rawWebhookData: payload,
      expectedCurrentStatus: depositRequest.status
    });

    if (nowPaymentsService.isSuccessfulPaymentStatus(effectiveMappedStatus)) {
      logNowPayments('payment.status-terminal-success', {
        source: options.source || 'webhook',
        paymentRecordId: nextPaymentRecord.id,
        depositId: depositRequest.id,
        userId: depositRequest.user_id,
        previousDepositStatus,
        nextDepositStatus,
        paymentStatus: effectiveMappedStatus
      });
      await reconcileSuccessfulDepositCreditWithClient(
        client,
        nextPaymentRecord,
        nextDepositRequest || {
          ...depositRequest,
          status: nextDepositStatus,
          payment_status: effectiveMappedStatus
        },
        payload,
        { paymentStatus: effectiveMappedStatus }
      );
    } else {
      logNowPayments('wallet-credit.skipped', {
        source: options.source || 'webhook',
        paymentRecordId: nextPaymentRecord.id,
        depositId: depositRequest.id,
        userId: depositRequest.user_id,
        previousDepositStatus,
        nextDepositStatus,
        paymentStatus: effectiveMappedStatus,
        reason: ['failed', 'expired'].includes(effectiveMappedStatus) ? 'terminal_non_success' : 'awaiting_success_status'
      });
    }
  } else {
    logNowPayments('wallet-credit.skipped', {
      source: options.source || 'webhook',
      paymentRecordId: nextPaymentRecord.id,
      depositId: null,
      userId: nextPaymentRecord.user_id,
      paymentStatus: effectiveMappedStatus,
      reason: 'deposit_request_not_found'
    });
  }

  return normalizePaymentRecord(await paymentRepository.getNowPaymentsPaymentById(client, paymentRecord.id));
}

async function processNowPaymentsPayload(payload, options = {}) {
  return withTransaction((client) => processNowPaymentsPayloadWithClient(client, payload, options));
}

async function syncNowPaymentsPaymentWithClient(client, paymentId, options = {}) {
  const paymentRecord = await resolveNowPaymentsPaymentRecord(client, paymentId, { forUpdate: true });
  if (!paymentRecord) {
    throw new ApiError(404, 'Payment not found');
  }
  const providerPaymentId = paymentRecord.provider_payment_id;
  if (!providerPaymentId) {
    throw new ApiError(400, 'Provider payment id is missing');
  }
  logNowPayments('payment.sync-requested', {
    source: options.source || 'sync',
    paymentLookupId: paymentId,
    paymentRecordId: paymentRecord.id,
    depositId: paymentRecord.deposit_id,
    userId: paymentRecord.user_id,
    providerPaymentId,
    providerOrderId: paymentRecord.provider_order_id || null,
    paymentStatus: paymentRecord.payment_status || null
  });
  const providerPayload = await nowPaymentsService.getPaymentStatus(providerPaymentId);
  return processNowPaymentsPayloadWithClient(client, providerPayload, { source: options.source || 'sync' });
}

async function syncNowPaymentsPayment(paymentId, options = {}) {
  return withTransaction((client) => syncNowPaymentsPaymentWithClient(client, paymentId, options));
}

async function maybeAutoSyncNowPaymentsPayment(paymentRecord, options = {}) {
  if (!shouldAttemptAutoSync(paymentRecord, options)) {
    return paymentRecord;
  }

  try {
    logNowPayments('payment.auto-sync-triggered', {
      source: options.source || 'auto-sync',
      paymentRecordId: paymentRecord.id,
      depositId: paymentRecord.deposit_id,
      userId: paymentRecord.user_id,
      providerPaymentId: paymentRecord.provider_payment_id,
      providerOrderId: paymentRecord.provider_order_id || null,
      paymentStatus: paymentRecord.payment_status || null
    });
    const synced = await syncNowPaymentsPayment(paymentRecord.id, { source: options.source || 'auto-sync' });
    return synced || paymentRecord;
  } catch (error) {
    logNowPayments('payment.auto-sync-failed', {
      source: options.source || 'auto-sync',
      paymentRecordId: paymentRecord.id,
      depositId: paymentRecord.deposit_id,
      userId: paymentRecord.user_id,
      providerPaymentId: paymentRecord.provider_payment_id,
      providerOrderId: paymentRecord.provider_order_id || null,
      paymentStatus: paymentRecord.payment_status || null,
      errorMessage: error?.message || 'Unknown error',
      errorStatus: error?.statusCode || error?.status || null
    });
    return paymentRecord;
  }
}

async function syncPendingNowPaymentsPaymentsForUser(userId, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 1), 5));
  const requests = await walletRepository.listDepositRequests(null, userId, 50);
  const pendingRequests = requests
    .filter((item) => {
      if (String(item.payment_provider || '').toLowerCase() !== nowPaymentsService.NOWPAYMENTS_PROVIDER) return false;
      if (item.is_processed) return false;
      const status = String(item.payment_status || '').trim().toLowerCase() || 'waiting';
      return AUTO_SYNCABLE_PAYMENT_STATUSES.has(status);
    })
    .slice(0, limit);

  for (const request of pendingRequests) {
    const details = request.details && typeof request.details === 'object' && !Array.isArray(request.details) ? request.details : {};
    const lookupId = details.paymentRecordId || request.payment_id || request.order_id || request.id;
    const paymentRecord = await resolveNowPaymentsPaymentRecord(null, lookupId);
    if (!paymentRecord) {
      logNowPayments('payment.auto-sync.lookup-miss', {
        source: options.source || 'user-pending-sync',
        userId,
        depositId: request.id,
        lookupId
      });
      continue;
    }
    await maybeAutoSyncNowPaymentsPayment(paymentRecord, { ...options, source: options.source || 'user-pending-sync' });
  }
}

async function getNowPaymentsPaymentForUserById(paymentId, userId) {
  const paymentRecord = await paymentRepository.getNowPaymentsPaymentById(null, paymentId);
  if (!paymentRecord) {
    logNowPayments('status-page.lookup-miss', { lookupId: paymentId, userId, scope: 'wallet.nowpayments' });
    throw new ApiError(404, 'Payment not found');
  }
  if (String(paymentRecord.user_id) !== String(userId)) {
    logNowPayments('status-page.lookup-denied', {
      lookupId: paymentId,
      paymentRecordId: paymentRecord.id,
      paymentUserId: paymentRecord.user_id,
      userId,
      scope: 'wallet.nowpayments'
    });
    throw new ApiError(404, 'Payment not found');
  }
  logNowPayments('status-page.lookup-hit', {
    lookupId: paymentId,
    paymentRecordId: paymentRecord.id,
    depositId: paymentRecord.deposit_id,
    userId: paymentRecord.user_id,
    paymentStatus: paymentRecord.payment_status,
    scope: 'wallet.nowpayments'
  });
  const currentPaymentRecord = await maybeAutoSyncNowPaymentsPayment(paymentRecord, { source: 'status-page-auto-sync' });
  return normalizePaymentRecord(currentPaymentRecord);
}

async function getPaymentForUser(paymentId, userId, options = {}) {
  const paymentRecord = await resolveNowPaymentsPaymentRecord(null, paymentId);
  if (!paymentRecord) {
    logNowPayments('status-page.lookup-miss', { lookupId: paymentId, userId, role: options.role || null });
    throw new ApiError(404, 'Payment not found');
  }
  const role = String(options.role || '').toLowerCase();
  const isSuperAdmin = role === 'super_admin';
  const isOwner = String(paymentRecord.user_id) === String(userId);
  if (!isSuperAdmin && !isOwner) {
    logNowPayments('status-page.lookup-denied', {
      lookupId: paymentId,
      paymentRecordId: paymentRecord.id,
      paymentUserId: paymentRecord.user_id,
      userId,
      role
    });
    throw new ApiError(404, 'Payment not found');
  }
  logNowPayments('status-page.lookup-hit', {
    lookupId: paymentId,
    paymentRecordId: paymentRecord.id,
    depositId: paymentRecord.deposit_id,
    userId: paymentRecord.user_id,
    paymentStatus: paymentRecord.payment_status
  });
  const currentPaymentRecord = await maybeAutoSyncNowPaymentsPayment(paymentRecord, { source: 'status-page-auto-sync' });
  return normalizePaymentRecord(currentPaymentRecord, { includeSensitive: isSuperAdmin && !isOwner });
}

async function listAdminNowPaymentsPayments(filters, pagination) {
  const result = await paymentRepository.listNowPaymentsPaymentsAdmin(null, filters, pagination);
  return {
    items: result.items.map((item) => normalizePaymentRecord(item, { includeSensitive: true })),
    total: result.total
  };
}

async function getAdminNowPaymentsPayment(paymentId) {
  const paymentRecord = await paymentRepository.getNowPaymentsPaymentById(null, paymentId);
  if (!paymentRecord) {
    throw new ApiError(404, 'Payment not found');
  }
  return normalizePaymentRecord(paymentRecord, { includeSensitive: true });
}

module.exports = {
  createNowPaymentsDepositPayment,
  createNowPaymentsDepositPaymentWithClient,
  processNowPaymentsPayload,
  processNowPaymentsPayloadWithClient,
  syncNowPaymentsPayment,
  syncNowPaymentsPaymentWithClient,
  syncPendingNowPaymentsPaymentsForUser,
  getNowPaymentsPaymentForUserById,
  getPaymentForUser,
  listAdminNowPaymentsPayments,
  getAdminNowPaymentsPayment,
  normalizePaymentRecord,
  PAYMENT_EXPIRY_MINUTES
};
