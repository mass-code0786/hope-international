import { create } from 'zustand';
import { clearStoredToken, getRememberedLoginPreference, getStoredToken, setRememberedUsername, setStoredToken } from '@/lib/utils/tokenStorage';

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

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  hydrated: false,
  isLoggingOut: false,
  registrationSummary: null,
  rememberMe: false,
  setSession: ({ token, user, rememberMe = false, username = '' }) => {
    if (token) setStoredToken(token, { rememberMe });
    setRememberedUsername(username || user?.username || '', true);
    set({ token, user, rememberMe, isLoggingOut: false });
  },
  setRememberPreference: (rememberMe, username = '') => {
    setRememberedUsername(username, rememberMe);
    set({ rememberMe: Boolean(rememberMe) });
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
  clearSession: ({ loggingOut = false } = {}) => {
    clearStoredToken();
    set({ token: null, user: null, rememberMe: false, isLoggingOut: Boolean(loggingOut) });
  },
  hydrate: () => {
    const token = getStoredToken();
    const currentUser = get().user;
    set({
      token,
      user: token ? currentUser : null,
      hydrated: true,
      isLoggingOut: false,
      registrationSummary: readRegistrationSummary(),
      rememberMe: getRememberedLoginPreference()
    });
  }
}));
