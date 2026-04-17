import { create } from 'zustand';
import { clearStoredToken, getRememberedLoginPreference, getStoredToken, setRememberedUsername, setStoredToken } from '@/lib/utils/tokenStorage';

const REGISTRATION_SUMMARY_KEY = 'hope_registration_summary';
const SESSION_PERSIST_DELAY_MS = 75;

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
  currentUserStatus: 'idle',
  currentUserError: null,
  currentUserInitialized: false,
  currentUserVersion: 0,
  setSession: async ({ token, user, rememberMe = false, username = '' }) => {
    if (token) {
      setStoredToken(token, { rememberMe });
      await new Promise((resolve) => window.setTimeout(resolve, SESSION_PERSIST_DELAY_MS));
    }
    setRememberedUsername(username || user?.username || '', true);
    set({
      token,
      user,
      rememberMe,
      isLoggingOut: false,
      currentUserStatus: user ? 'ready' : 'idle',
      currentUserError: null,
      currentUserInitialized: Boolean(user)
    });
  },
  setRememberPreference: (rememberMe, username = '') => {
    setRememberedUsername(username, rememberMe);
    set({ rememberMe: Boolean(rememberMe) });
  },
  setUser: (user) => set({
    user,
    currentUserStatus: user ? 'ready' : 'idle',
    currentUserError: null,
    currentUserInitialized: Boolean(user)
  }),
  setCurrentUserState: (payload = {}) => set((state) => ({
    user: Object.prototype.hasOwnProperty.call(payload, 'user') ? (payload.user || null) : state.user,
    currentUserStatus: payload.status || state.currentUserStatus,
    currentUserError: Object.prototype.hasOwnProperty.call(payload, 'error') ? payload.error : state.currentUserError,
    currentUserInitialized: Object.prototype.hasOwnProperty.call(payload, 'initialized') ? Boolean(payload.initialized) : state.currentUserInitialized
  })),
  refreshCurrentUser: () => set((state) => ({
    currentUserStatus: 'idle',
    currentUserError: null,
    currentUserInitialized: false,
    currentUserVersion: state.currentUserVersion + 1
  })),
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
    set({
      token: null,
      user: null,
      rememberMe: false,
      isLoggingOut: Boolean(loggingOut),
      currentUserStatus: 'idle',
      currentUserError: null,
      currentUserInitialized: false
    });
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
      rememberMe: getRememberedLoginPreference(),
      currentUserStatus: token ? (currentUser ? 'ready' : 'idle') : 'idle',
      currentUserError: null,
      currentUserInitialized: Boolean(token && currentUser)
    });
  }
}));
