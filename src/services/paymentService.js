const { withTransaction } = require('../db/pool');
const walletRepository = require('../repositories/walletRepository');
const paymentRepository = require('../repositories/paymentRepository');
const walletService = require('./walletService');
const nowPaymentsService = require('./nowPaymentsService');
const { ApiError } = require('../utils/ApiError');
const {
  DEPOSIT_STATUS,
  toDepositStatus,
  getDepositStatusLabel,
  getDepositStatusMessage,
  getDepositUserFacingStatus,
  depositRequiresAdminReview,
  isRejectedDepositStatus,
  isSuccessfulDepositStatus
} = require('../utils/depositStatus');

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

function getSettlementEligibility(rawProviderStatus, mappedStatus) {
  const providerStatus = String(rawProviderStatus || '').trim().toLowerCase() || null;
  const localStatus = String(mappedStatus || '').trim().toLowerCase() || null;
  const providerEligible = nowPaymentsService.isSuccessfulPaymentStatus(providerStatus);
  const localEligible = nowPaymentsService.isSuccessfulPaymentStatus(localStatus);
  return {
    providerStatus,
    localStatus,
    eligible: providerEligible || localEligible,
    reason: providerEligible
      ? 'provider_status_success'
      : localEligible
        ? 'mapped_status_success'
        : 'not_success_terminal'
  };
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
  const depositRequest = options.depositRequest || null;
  const requestedAmount = Number(record.requested_amount || 0);
  const totalPayableAmount = Number(record.price_amount || 0);
  const feeAmount = Math.max(0, Number((totalPayableAmount - requestedAmount).toFixed(2)));
  const expectedAmount = record.expected_amount === null || record.expected_amount === undefined ? null : Number(record.expected_amount);
  const payAmount = record.pay_amount === null || record.pay_amount === undefined ? null : Number(record.pay_amount);
  const actuallyPaid = Number(record.actually_paid || 0);
  const exactPayableAmount = payAmount ?? expectedAmount;
  const remainingPayAmount = exactPayableAmount == null ? null : Math.max(0, Number((exactPayableAmount - actuallyPaid).toFixed(8)));
  const locallyExpired = !['confirmed', 'finished', 'failed', 'expired'].includes(String(record.payment_status || '').toLowerCase())
    && isExpiredAt(record.expires_at);
  const effectivePaymentStatus = locallyExpired ? 'expired' : record.payment_status;
  let userFacingStatus = getFriendlyPaymentStatus(effectivePaymentStatus);

  if (depositRequest) {
    userFacingStatus = getDepositUserFacingStatus({
      ...depositRequest,
      payment_status: effectivePaymentStatus,
      is_credited: record.is_credited,
      wallet_credit_applied: record.wallet_credit_applied
    });
  }

  const normalized = {
    ...record,
    requested_amount: requestedAmount,
    expected_amount: expectedAmount,
    price_amount: totalPayableAmount,
    deposit_amount: requestedAmount,
    fee_amount: feeAmount,
    total_payable_amount: totalPayableAmount,
    pay_amount: payAmount,
    exact_payable_amount: exactPayableAmount,
    exact_payable_currency: record.pay_currency || nowPaymentsService.NOWPAYMENTS_DISPLAY_CURRENCY,
    actually_paid: actuallyPaid,
    remaining_pay_amount: remainingPayAmount,
    outcome_amount: record.outcome_amount === null || record.outcome_amount === undefined ? null : Number(record.outcome_amount),
    network: record.network || nowPaymentsService.NOWPAYMENTS_DISPLAY_NETWORK,
    pay_currency: nowPaymentsService.NOWPAYMENTS_DISPLAY_CURRENCY,
    payment_address: record.payment_address || record.pay_address || null,
    status_history: Array.isArray(record.status_history) ? record.status_history : [],
    deposit_id: record.deposit_id || null,
    order_id: record.order_id || null,
    payment_status: effectivePaymentStatus,
    user_facing_status: userFacingStatus,
    is_terminal: ['confirmed', 'finished', 'failed', 'expired'].includes(String(effectivePaymentStatus || '').toLowerCase()),
    is_completed: ['confirmed', 'finished'].includes(String(effectivePaymentStatus || '').toLowerCase()),
    is_expired: locallyExpired || String(record.payment_status || '').toLowerCase() === 'expired'
  };

  if (depositRequest) {
    normalized.deposit_status = toDepositStatus(depositRequest.status);
    normalized.deposit_status_label = getDepositStatusLabel(depositRequest.status);
    normalized.deposit_status_message = getDepositStatusMessage({
      ...depositRequest,
      payment_status: effectivePaymentStatus,
      is_credited: record.is_credited,
      wallet_credit_applied: record.wallet_credit_applied
    });
    normalized.requires_super_admin_approval = depositRequiresAdminReview({
      ...depositRequest,
      payment_status: effectivePaymentStatus
    });
    normalized.approved_by = depositRequest.approved_by || null;
    normalized.approved_at = depositRequest.approved_at || null;
    normalized.is_manual = Boolean(depositRequest.is_manual);
  }

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

  if (isRejectedDepositStatus(depositRequest.status)) {
    logNowPayments('wallet-credit.skipped', {
      paymentRecordId: paymentRecord.id,
      depositId: depositRequest.id,
      userId: depositRequest.user_id,
      providerPaymentId: paymentRecord.provider_payment_id,
      providerOrderId: paymentRecord.provider_order_id || null,
      rawProviderStatus: payload?.payment_status || null,
      paymentStatus: options.paymentStatus || paymentRecord.payment_status || null,
      reason: 'deposit_rejected_by_super_admin'
    });
    return {
      paymentRecord,
      alreadyCredited: false,
      rejected: true
    };
  }

  const existingCredit = await walletRepository.getTransactionBySourceAndReference(
    client,
    depositRequest.user_id,
    'deposit_request',
    depositRequest.id
  );
  const paymentFlagsApplied = Boolean(paymentRecord.is_credited || paymentRecord.wallet_credit_applied);
  const depositFlagsApplied = Boolean(depositRequest.is_processed && depositRequest.processed_at);
  const alreadyApplied = Boolean(existingCredit || (paymentFlagsApplied && depositFlagsApplied));

  logNowPayments('wallet-credit.reconcile', {
    paymentRecordId: paymentRecord.id,
    depositId: depositRequest.id,
    userId: depositRequest.user_id,
    providerPaymentId: paymentRecord.provider_payment_id,
    providerOrderId: paymentRecord.provider_order_id || null,
    rawProviderStatus: payload?.payment_status || null,
    paymentStatus: options.paymentStatus || paymentRecord.payment_status || null,
    alreadyCredited: Boolean(existingCredit),
    alreadyApplied,
    paymentFlagsApplied,
    depositFlagsApplied
  });

  const creditedAt = paymentRecord.credited_at || existingCredit?.created_at || depositRequest.processed_at || new Date().toISOString();
  let settled = null;

  if (alreadyApplied) {
    logNowPayments('wallet-credit.duplicate-prevented', {
      paymentRecordId: paymentRecord.id,
      depositId: depositRequest.id,
      userId: depositRequest.user_id,
      providerPaymentId: paymentRecord.provider_payment_id,
      providerOrderId: paymentRecord.provider_order_id || null,
      rawProviderStatus: payload?.payment_status || null,
      paymentStatus: options.paymentStatus || paymentRecord.payment_status || null,
      existingCreditTransactionId: existingCredit?.id || null,
      paymentAlreadyMarkedCredited: Boolean(paymentRecord.is_credited || paymentRecord.wallet_credit_applied),
      depositAlreadyProcessed: Boolean(depositRequest.is_processed),
      depositProcessedAt: depositRequest.processed_at || null
    });
  } else {
    logNowPayments('wallet-settlement.called', {
      paymentRecordId: paymentRecord.id,
      depositId: depositRequest.id,
      userId: depositRequest.user_id,
      providerPaymentId: paymentRecord.provider_payment_id,
      providerOrderId: paymentRecord.provider_order_id || null,
      rawProviderStatus: payload?.payment_status || null,
      paymentStatus: options.paymentStatus || paymentRecord.payment_status || null
    });
    settled = await walletService.settleDepositRequest(client, depositRequest.id, {
      status: DEPOSIT_STATUS.SUCCESS,
      paymentStatus: options.paymentStatus || paymentRecord.payment_status || null,
      rawWebhookData: payload,
      approvedBy: null,
      approvedAt: creditedAt,
      extraDetails: {
        paymentRecordId: paymentRecord.id,
        confirmedBy: nowPaymentsService.NOWPAYMENTS_PROVIDER,
        confirmedAt: creditedAt,
        creditedAt,
        walletCreditApplied: true
      }
    });
    logNowPayments('wallet-settlement.succeeded', {
      paymentRecordId: paymentRecord.id,
      depositId: depositRequest.id,
      userId: depositRequest.user_id,
      providerPaymentId: paymentRecord.provider_payment_id,
      providerOrderId: paymentRecord.provider_order_id || null,
      rawProviderStatus: payload?.payment_status || null,
      paymentStatus: options.paymentStatus || paymentRecord.payment_status || null,
      alreadyProcessed: Boolean(settled?.alreadyProcessed)
    });
  }

  const latestPaymentRecord = await paymentRepository.updateNowPaymentsPayment(client, paymentRecord.id, {
    isCredited: true,
    walletCreditApplied: true,
    creditedAt,
    rawPayload: payload
  });

  logNowPayments('wallet.credited', {
    paymentRecordId: paymentRecord.id,
    depositId: depositRequest.id,
    userId: depositRequest.user_id,
    providerPaymentId: paymentRecord.provider_payment_id,
    providerOrderId: paymentRecord.provider_order_id || null,
    rawProviderStatus: payload?.payment_status || null,
    paymentStatus: options.paymentStatus || paymentRecord.payment_status || null,
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
  const payCurrency = nowPaymentsService.normalizeCurrency(payload.payCurrency);
  const network = nowPaymentsService.normalizeNetwork(payload.network);
  const providerOrderId = buildDepositOrderId(userId);
  const providerPayment = await nowPaymentsService.createPayment({
    priceAmount: depositAmount,
    priceCurrency: 'usd',
    payCurrency,
    orderId: providerOrderId,
    orderDescription: `Hope International deposit for user ${userId}`
  });
  logNowPayments('provider.create-payment.response', {
    providerPaymentId: providerPayment.payment_id || null,
    providerOrderId,
    priceAmount: providerPayment.price_amount ?? null,
    priceCurrency: providerPayment.price_currency || null,
    payAmount: providerPayment.pay_amount ?? null,
    payCurrency: providerPayment.pay_currency || null,
    actuallyPaid: providerPayment.actually_paid ?? null,
    outcomeAmount: providerPayment.outcome_amount ?? null,
    outcomeCurrency: providerPayment.outcome_currency || null,
    paymentStatus: providerPayment.payment_status || null
  });
  const providerPriceAmount = providerPayment.price_amount === undefined ? depositAmount : toMoney(providerPayment.price_amount || 0);
  const providerFeeAmount = Math.max(0, Number((providerPriceAmount - depositAmount).toFixed(2)));
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
      feeAmount: providerFeeAmount,
      totalPayableAmount: providerPriceAmount,
      priceAmount: providerPriceAmount,
      priceCurrency: 'USD',
      network,
      payCurrency: nowPaymentsService.NOWPAYMENTS_DISPLAY_CURRENCY,
      payAmount: toCryptoAmount(providerPayment.pay_amount || 0),
      payAddress: providerPayment.pay_address || null,
      providerPaymentId: providerPayment.payment_id || null,
      paymentStatus: nowPaymentsService.mapPaymentStatus(providerPayment.payment_status || 'waiting'),
      expiresAt
    },
    status: DEPOSIT_STATUS.PENDING
  });

  const paymentRecord = await paymentRepository.createNowPaymentsPayment(client, {
    userId,
    depositId: depositRequest.id,
    providerPaymentId: String(providerPayment.payment_id || ''),
    providerOrderId,
    network,
    requestedAmount: depositAmount,
    expectedAmount: toCryptoAmount(providerPayment.pay_amount || 0),
    priceAmount: providerPriceAmount,
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
    feeAmount: providerFeeAmount,
    totalPayableAmount: providerPriceAmount,
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
        feeAmount: providerFeeAmount,
        totalPayableAmount: providerPriceAmount,
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

  const rawProviderStatus = payload.payment_status || paymentRecord.payment_status || null;
  logNowPayments('provider.status-payload', {
    source: options.source || 'webhook',
    providerPaymentId: providerPaymentId || paymentRecord.provider_payment_id || null,
    providerOrderId: providerOrderId || paymentRecord.provider_order_id || null,
    priceAmount: payload.price_amount ?? null,
    priceCurrency: payload.price_currency || null,
    payAmount: payload.pay_amount ?? null,
    payCurrency: payload.pay_currency || null,
    actuallyPaid: payload.actually_paid ?? null,
    outcomeAmount: payload.outcome_amount ?? null,
    outcomeCurrency: payload.outcome_currency || null,
    paymentStatus: rawProviderStatus
  });
  const mappedStatus = nowPaymentsService.mapPaymentStatus(rawProviderStatus);
  const expiresAt = resolveExpiresAt(payload.expiration_estimate_date || paymentRecord.expires_at, buildLocalExpiryDate(new Date(paymentRecord.created_at || Date.now())));
  const effectiveMappedStatus = ['confirmed', 'finished', 'failed', 'expired'].includes(mappedStatus)
    ? mappedStatus
    : (isExpiredAt(expiresAt) ? 'expired' : mappedStatus);
  const settlementEligibility = getSettlementEligibility(rawProviderStatus, effectiveMappedStatus);
  const statusHistory = Array.isArray(paymentRecord.status_history) ? [...paymentRecord.status_history] : [];
  statusHistory.push({
    status: effectiveMappedStatus,
    source: options.source || 'webhook',
    recordedAt: new Date().toISOString()
  });
  logNowPayments('payment.status-mapped', {
    source: options.source || 'webhook',
    paymentRecordId: paymentRecord.id,
    depositId: paymentRecord.deposit_id || null,
    userId: paymentRecord.user_id,
    providerPaymentId: providerPaymentId || paymentRecord.provider_payment_id,
    providerOrderId: providerOrderId || paymentRecord.provider_order_id,
    rawProviderStatus,
    mappedLocalStatus: effectiveMappedStatus
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
    rawProviderStatus,
    previousPaymentStatus,
    paymentStatus: effectiveMappedStatus,
    expiresAt
  });
  logNowPayments('payment.status-transition', {
    source: options.source || 'webhook',
    paymentRecordId: nextPaymentRecord.id,
    depositId: nextPaymentRecord.deposit_id,
    userId: nextPaymentRecord.user_id,
    providerPaymentId: nextPaymentRecord.provider_payment_id,
    providerOrderId: nextPaymentRecord.provider_order_id,
    rawProviderStatus,
    previousLocalStatus: previousPaymentStatus,
    newLocalStatus: effectiveMappedStatus
  });
  logNowPayments('payment.settlement-eligibility', {
    source: options.source || 'webhook',
    paymentRecordId: nextPaymentRecord.id,
    depositId: nextPaymentRecord.deposit_id,
    userId: nextPaymentRecord.user_id,
    providerPaymentId: nextPaymentRecord.provider_payment_id,
    providerOrderId: nextPaymentRecord.provider_order_id,
    rawProviderStatus: settlementEligibility.providerStatus,
    mappedLocalStatus: settlementEligibility.localStatus,
    eligible: settlementEligibility.eligible,
    reason: settlementEligibility.reason
  });

  if (depositRequest) {
    if (String(paymentRecord.user_id) !== String(depositRequest.user_id)) {
      logNowPayments('wallet-credit.skipped', {
        source: options.source || 'webhook',
        paymentRecordId: nextPaymentRecord.id,
        depositId: depositRequest.id,
        userId: depositRequest.user_id,
        rawProviderStatus: settlementEligibility.providerStatus,
        mappedLocalStatus: settlementEligibility.localStatus,
        paymentStatus: effectiveMappedStatus,
        reason: 'deposit_owner_mapping_mismatch'
      });
      throw new ApiError(500, 'NOWPayments deposit owner mapping mismatch');
    }

    const expectedAmount = toMoney(paymentRecord.price_amount || 0);
    const payloadPriceAmount = payload.price_amount === undefined ? expectedAmount : toMoney(payload.price_amount || 0);
    if (Math.abs(expectedAmount - payloadPriceAmount) > 0.01) {
      logNowPayments('wallet-credit.skipped', {
        source: options.source || 'webhook',
        paymentRecordId: nextPaymentRecord.id,
        depositId: depositRequest.id,
        userId: depositRequest.user_id,
        rawProviderStatus: settlementEligibility.providerStatus,
        mappedLocalStatus: settlementEligibility.localStatus,
        paymentStatus: effectiveMappedStatus,
        expectedPriceAmount: expectedAmount,
        payloadPriceAmount,
        reason: 'amount_mismatch'
      });
      throw new ApiError(400, 'NOWPayments amount mismatch');
    }

    const nextDepositStatus = isRejectedDepositStatus(depositRequest.status)
      ? DEPOSIT_STATUS.REJECTED
      : isSuccessfulDepositStatus(depositRequest.status)
        ? DEPOSIT_STATUS.SUCCESS
      : ['failed', 'expired'].includes(effectiveMappedStatus)
        ? DEPOSIT_STATUS.PENDING
        : nowPaymentsService.isSuccessfulPaymentStatus(effectiveMappedStatus)
          ? DEPOSIT_STATUS.SUCCESS
          : toDepositStatus(depositRequest.status, DEPOSIT_STATUS.PENDING);

    const nextDepositPayload = {
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
    };

    if (nextDepositStatus === DEPOSIT_STATUS.SUCCESS) {
      nextDepositPayload.approvedBy = null;
      nextDepositPayload.approvedAt = nextPaymentRecord.credited_at || new Date().toISOString();
    }

    const nextDepositRequest = await walletRepository.updateDepositRequestStatus(client, depositRequest.id, nextDepositPayload);

    if (settlementEligibility.eligible && !isRejectedDepositStatus(nextDepositRequest?.status || depositRequest.status)) {
      logNowPayments('payment.status-terminal-success', {
        source: options.source || 'webhook',
        paymentRecordId: nextPaymentRecord.id,
        depositId: depositRequest.id,
        userId: depositRequest.user_id,
        rawProviderStatus: settlementEligibility.providerStatus,
        mappedLocalStatus: settlementEligibility.localStatus,
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
        rawProviderStatus: settlementEligibility.providerStatus,
        mappedLocalStatus: settlementEligibility.localStatus,
        previousDepositStatus,
        nextDepositStatus,
        paymentStatus: effectiveMappedStatus,
        reason: ['failed', 'expired'].includes(effectiveMappedStatus) ? 'terminal_non_success' : settlementEligibility.reason
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
  const depositRequest = currentPaymentRecord?.deposit_id
    ? await walletRepository.getDepositRequestById(null, currentPaymentRecord.deposit_id)
    : null;
  return normalizePaymentRecord(currentPaymentRecord, { depositRequest });
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
  const depositRequest = currentPaymentRecord?.deposit_id
    ? await walletRepository.getDepositRequestById(null, currentPaymentRecord.deposit_id)
    : null;
  return normalizePaymentRecord(currentPaymentRecord, {
    includeSensitive: isSuperAdmin && !isOwner,
    depositRequest
  });
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
  const depositRequest = paymentRecord.deposit_id
    ? await walletRepository.getDepositRequestById(null, paymentRecord.deposit_id)
    : null;
  return normalizePaymentRecord(paymentRecord, { includeSensitive: true, depositRequest });
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
