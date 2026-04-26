'use client';

const REGISTRATION_SUCCESS_PENDING_KEY = 'hope_registration_success_pending';

export function markRegistrationSuccessPending() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(REGISTRATION_SUCCESS_PENDING_KEY, '1');
}

export function hasRegistrationSuccessPending() {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(REGISTRATION_SUCCESS_PENDING_KEY) === '1';
}

export function clearRegistrationSuccessPending() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(REGISTRATION_SUCCESS_PENDING_KEY);
}
