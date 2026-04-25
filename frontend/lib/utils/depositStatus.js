const STATUS_MAP = Object.freeze({
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
  pending: 'PENDING',
  approved: 'SUCCESS',
  completed: 'SUCCESS',
  success: 'SUCCESS',
  failed: 'FAILED',
  rejected: 'REJECTED'
});

export function normalizeDepositStatus(value) {
  const token = String(value || '').trim();
  if (!token) return 'PENDING';
  return STATUS_MAP[token] || STATUS_MAP[token.toLowerCase()] || 'PENDING';
}

export function depositStatusKey(value) {
  const status = normalizeDepositStatus(value);
  if (status === 'SUCCESS') return 'approved';
  if (status === 'REJECTED') return 'rejected';
  if (status === 'FAILED') return 'failed';
  return 'pending';
}

export function depositStatusLabel(value) {
  const status = normalizeDepositStatus(value);
  if (status === 'SUCCESS') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'FAILED') return 'Failed';
  return 'Pending';
}

export function depositStatusVariant(value) {
  const key = depositStatusKey(value);
  if (key === 'approved') return 'success';
  if (key === 'rejected' || key === 'failed') return 'danger';
  return 'warning';
}

export function depositUserFacingStatus(item = {}) {
  return String(item.user_facing_status || '').trim().toLowerCase() || depositStatusKey(item.status);
}

export function depositStatusMessage(item = {}) {
  if (item.status_message) return item.status_message;
  if (item.requires_super_admin_approval) return 'Waiting for super admin approval';
  if (depositStatusKey(item.status) === 'approved') return 'Approved';
  if (depositStatusKey(item.status) === 'rejected') return 'Rejected';
  if (depositStatusKey(item.status) === 'failed') return 'Deposit could not be completed';
  return 'Waiting for payment confirmation';
}

export function isDepositApproved(item = {}) {
  return depositStatusKey(item.status) === 'approved';
}
