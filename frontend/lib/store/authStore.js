import { create } from 'zustand';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/utils/tokenStorage';

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  hydrated: false,
  setSession: ({ token, user }) => {
    if (token) setStoredToken(token);
    set({ token, user });
  },
  setUser: (user) => set({ user }),
  clearSession: () => {
    clearStoredToken();
    set({ token: null, user: null });
  },
  hydrate: () => {
    const token = getStoredToken();
    set({ token, user: null, hydrated: true });
  }
}));
