import { create } from 'zustand';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/utils/tokenStorage';

const REGISTRATION_SUMMARY_KEY = 'hope_registration_summary';

function readRegistrationSummary() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(REGISTRATION_SUMMARY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function writeRegistrationSummary(summary) {
  if (typeof window === 'undefined') return;
  if (!summary) {
    window.sessionStorage.removeItem(REGISTRATION_SUMMARY_KEY);
    return;
  }
  window.sessionStorage.setItem(REGISTRATION_SUMMARY_KEY, JSON.stringify(summary));
}

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  hydrated: false,
  registrationSummary: null,
  setSession: ({ token, user }) => {
    if (token) setStoredToken(token);
    set({ token, user });
  },
  setUser: (user) => set({ user }),
  setRegistrationSummary: (registrationSummary) => {
    writeRegistrationSummary(registrationSummary);
    set({ registrationSummary });
  },
  clearRegistrationSummary: () => {
    writeRegistrationSummary(null);
    set({ registrationSummary: null });
  },
  clearSession: () => {
    clearStoredToken();
    set({ token: null, user: null });
  },
  hydrate: () => {
    const token = getStoredToken();
    set({ token, user: null, hydrated: true, registrationSummary: readRegistrationSummary() });
  }
}));
