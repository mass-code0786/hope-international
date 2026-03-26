import { create } from 'zustand';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/utils/tokenStorage';
import { clearDemoSession, getStoredDemoSession, storeDemoSession } from '@/lib/utils/demoSession';

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  hydrated: false,
  setSession: ({ token, user }) => {
    if (token) setStoredToken(token);
    if (user?.is_demo) {
      storeDemoSession({ token, user });
    } else {
      clearDemoSession();
    }
    set({ token, user });
  },
  setUser: (user) => set({ user }),
  clearSession: () => {
    clearStoredToken();
    clearDemoSession();
    set({ token: null, user: null });
  },
  hydrate: () => {
    const token = getStoredToken();
    const demoSession = getStoredDemoSession();
    set({ token, user: demoSession?.user || null, hydrated: true });
  }
}));
