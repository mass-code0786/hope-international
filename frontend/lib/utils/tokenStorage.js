'use client';

const TOKEN_KEY = 'hope_token';

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `hope_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = 'hope_token=; path=/; max-age=0; SameSite=Lax';
}
