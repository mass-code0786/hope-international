'use client';

const TOKEN_KEY = 'hope_token';
const REMEMBER_ME_KEY = 'hope_remember_me';
const REMEMBERED_USERNAME_KEY = 'hope_login_username';

function clearCookie(name) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function setCookie(name, value, maxAgeSeconds = null) {
  const maxAge = Number.isFinite(maxAgeSeconds) ? `; max-age=${Math.max(0, Math.trunc(maxAgeSeconds))}` : '';
  document.cookie = `${name}=${value}; path=/${maxAge}; SameSite=Lax`;
}

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token, options = {}) {
  if (typeof window === 'undefined') return;
  const rememberMe = Boolean(options.rememberMe);

  sessionStorage.setItem(TOKEN_KEY, token);
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_ME_KEY, 'true');
    setCookie('hope_token', token, 60 * 60 * 24 * 30);
    setCookie('hope_remember_me', 'true', 60 * 60 * 24 * 30);
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  setCookie('hope_token', token);
  clearCookie('hope_remember_me');
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  clearCookie('hope_token');
  clearCookie('hope_remember_me');
}

export function getRememberedLoginPreference() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
}

export function setRememberedUsername(username, remember = true) {
  if (typeof window === 'undefined') return;
  if (remember && String(username || '').trim()) {
    localStorage.setItem(REMEMBERED_USERNAME_KEY, String(username).trim());
    return;
  }
  localStorage.removeItem(REMEMBERED_USERNAME_KEY);
}

export function getRememberedUsername() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(REMEMBERED_USERNAME_KEY) || '';
}
