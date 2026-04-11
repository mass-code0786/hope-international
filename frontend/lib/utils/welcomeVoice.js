'use client';

export const WELCOME_VOICE_STORAGE_KEY = 'welcome_voice_played';

export function getTimeBasedGreeting(date = new Date()) {
  const hour = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = (hour * 60) + minutes;

  if (totalMinutes >= 300 && totalMinutes < 720) return 'Good Morning';
  if (totalMinutes >= 720 && totalMinutes < 1020) return 'Good Afternoon';
  if (totalMinutes >= 1020 && totalMinutes <= 1260) return 'Good Evening';
  return 'Welcome';
}

export function buildWelcomeVoiceMessage(username) {
  const greeting = getTimeBasedGreeting();
  const safeUsername = String(username || '').trim();
  const greetingPrefix = safeUsername ? `${greeting} ${safeUsername}` : greeting;
  return `${greetingPrefix}, welcome to Hope International E-commerce Platform`;
}

export function markWelcomeVoicePending() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(WELCOME_VOICE_STORAGE_KEY, 'pending');
}

export function markWelcomeVoicePlayed() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(WELCOME_VOICE_STORAGE_KEY, 'played');
}

export function getWelcomeVoiceState() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(WELCOME_VOICE_STORAGE_KEY);
}

export function clearWelcomeVoiceState() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(WELCOME_VOICE_STORAGE_KEY);
}

export function cancelSpeechSynthesis() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}
