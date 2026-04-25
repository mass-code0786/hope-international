const DEPOSIT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED'
});

const STATUS_ALIASES = Object.freeze({
  pending: DEPOSIT_STATUS.PENDING,
  approved: DEPOSIT_STATUS.SUCCESS,
  completed: DEPOSIT_STATUS.SUCCESS,
  success: DEPOSIT_STATUS.SUCCESS,
  failed: DEPOSIT_STATUS.FAILED,
  rejected: DEPOSIT_STATUS.REJECTED
});

const STATUS_KEYS = Object.freeze({
  [DEPOSIT_STATUS.PENDING]: 'pending',
  [DEPOSIT_STATUS.SUCCESS]: 'approved',
  [DEPOSIT_STATUS.FAILED]: 'failed',
  [DEPOSIT_STATUS.REJECTED]: 'rejected'
});

const STATUS_LABELS = Object.freeze({
  [DEPOSIT_STATUS.PENDING]: 'Pending',
  [DEPOSIT_STATUS.SUCCESS]: 'Approved',
  [DEPOSIT_STATUS.FAILED]: 'Failed',
  [DEPOSIT_STATUS.REJECTED]: 'Rejected'
});

const ADMIN_REVIEW_PAYMENT_STATUSES = new Set(['failed', 'expired']);

function normalizeStatusToken(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePaymentStatus(value) {
  return normalizeStatusToken(value).replace(/\s+/g, '_');
}

function toDepositStatus(value, fallback = DEPOSIT_STATUS.PENDING) {
  const normalized = normalizeStatusToken(value);
  if (!normalized) return fallback;

  const upper = normalized.toUpperCase();
  if (Object.values(DEPOSIT_STATUS).includes(upper)) {
    return upper;
  }

  return STATUS_ALIASES[normalized] || fallback;
}

function toDepositStatusKey(value) {
  return STATUS_KEYS[toDepositStatus(value)] || STATUS_KEYS[DEPOSIT_STATUS.PENDING];
}

function getDepositStatusLabel(value) {
  return STATUS_LABELS[toDepositStatus(value)] || STATUS_LABELS[DEPOSIT_STATUS.PENDING];
}

function isPendingDepositStatus(value) {
  return toDepositStatus(value) === DEPOSIT_STATUS.PENDING;
}

function isSuccessfulDepositStatus(value) {
  return toDepositStatus(value) === DEPOSIT_STATUS.SUCCESS;
}

function isFailedDepositStatus(value) {
  return toDepositStatus(value) === DEPOSIT_STATUS.FAILED;
}

function isRejectedDepositStatus(value) {
  return toDepositStatus(value) === DEPOSIT_STATUS.REJECTED;
}

function isFailedOrExpiredPaymentStatus(value) {
  return ADMIN_REVIEW_PAYMENT_STATUSES.has(normalizePaymentStatus(value));
}

function depositRequiresAdminReview(record = {}) {
  const provider = normalizeStatusToken(record.payment_provider);
  return isPendingDepositStatus(record.status) && (
    Boolean(record.is_manual)
    || !provider
    || isFailedOrExpiredPaymentStatus(record.payment_status)
  );
}

function getDepositStatusMessage(record = {}) {
  if (isSuccessfulDepositStatus(record.status)) {
    return record.approved_by || record.details?.manuallyApproved
      ? 'Approved by super admin'
      : 'Deposit credited successfully';
  }

  if (isRejectedDepositStatus(record.status)) {
    return 'Rejected by super admin';
  }

  if (depositRequiresAdminReview(record)) {
    return 'Waiting for super admin approval';
  }

  if (isPendingDepositStatus(record.status)) {
    return 'Waiting for payment confirmation';
  }

  if (isFailedDepositStatus(record.status)) {
    return 'Deposit could not be completed';
  }

  return null;
}

function getDepositUserFacingStatus(record = {}) {
  if (isSuccessfulDepositStatus(record.status) && (record.is_processed || record.approved_at || record.approved_by || record.is_credited || record.wallet_credit_applied)) {
    return 'wallet_credited';
  }

  if (isRejectedDepositStatus(record.status)) {
    return 'rejected';
  }

  if (depositRequiresAdminReview(record)) {
    return 'pending_admin_review';
  }

  const paymentStatus = normalizePaymentStatus(record.payment_status);
  if (paymentStatus) {
    return paymentStatus;
  }

  return toDepositStatusKey(record.status);
}

module.exports = {
  DEPOSIT_STATUS,
  toDepositStatus,
  toDepositStatusKey,
  getDepositStatusLabel,
  getDepositStatusMessage,
  getDepositUserFacingStatus,
  isPendingDepositStatus,
  isSuccessfulDepositStatus,
  isFailedDepositStatus,
  isRejectedDepositStatus,
  isFailedOrExpiredPaymentStatus,
  depositRequiresAdminReview
};
