'use client';

export const DEPOSIT_SUCCESS_POPUP_DURATION_MS = 20_000;

const STORAGE_PREFIX = 'hope.deposit.success.ack.';
const SUCCESS_STATUSES = new Set(['confirmed', 'finished', 'paid', 'completed', 'wallet_credited', 'success', 'approved']);

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function toStorageKey(key) {
  const safeKey = String(key || '').trim();
  return safeKey ? `${STORAGE_PREFIX}${safeKey}` : '';
}

function toKeyList(keys) {
  if (Array.isArray(keys)) return keys.filter(Boolean);
  return keys ? [keys] : [];
}

export function isDepositSuccessStatus(status) {
  return SUCCESS_STATUSES.has(normalizeStatus(status));
}

export function buildDepositSuccessAckKeys({ paymentId, depositId } = {}) {
  const keys = [];

  if (paymentId) {
    keys.push(`payment:${String(paymentId).trim()}`);
  }

  if (depositId) {
    keys.push(`deposit:${String(depositId).trim()}`);
  }

  return Array.from(new Set(keys));
}

export function hasAcknowledgedDepositSuccess(keys) {
  if (!canUseStorage()) return false;

  for (const key of toKeyList(keys)) {
    const storageKey = toStorageKey(key);
    if (!storageKey) continue;

    try {
      if (window.localStorage.getItem(storageKey) === '1') {
        return true;
      }
    } catch (_error) {
      return false;
    }
  }

  return false;
}

export function acknowledgeDepositSuccess(keys) {
  if (!canUseStorage()) return;

  for (const key of toKeyList(keys)) {
    const storageKey = toStorageKey(key);
    if (!storageKey) continue;

    try {
      window.localStorage.setItem(storageKey, '1');
    } catch (_error) {
      // Ignore storage write failures.
    }
  }
}
