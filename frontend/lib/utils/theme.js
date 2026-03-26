'use client';

const THEME_KEY = 'hope_theme';
const DEFAULT_THEME = 'dark';

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function getStoredTheme() {
  if (!canUseDom()) return DEFAULT_THEME;
  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === 'light' || saved === 'dark' ? saved : DEFAULT_THEME;
}

export function applyTheme(theme) {
  if (!canUseDom()) return;
  const safeTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', safeTheme);
  document.documentElement.style.colorScheme = safeTheme;
  window.localStorage.setItem(THEME_KEY, safeTheme);
  window.dispatchEvent(new CustomEvent('hope-theme-change', { detail: safeTheme }));
}

export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
}

export function toggleTheme(currentTheme) {
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(nextTheme);
  return nextTheme;
}
