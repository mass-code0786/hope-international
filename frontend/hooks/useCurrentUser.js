'use client';

import { useAuthStore } from '@/lib/store/authStore';

export function useCurrentUser(options = {}) {
  const {
    enabled = true,
    requireToken = true
  } = options;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const currentUserStatus = useAuthStore((state) => state.currentUserStatus);
  const currentUserError = useAuthStore((state) => state.currentUserError);
  const currentUserInitialized = useAuthStore((state) => state.currentUserInitialized);
  const refreshCurrentUser = useAuthStore((state) => state.refreshCurrentUser);
  const canUseToken = !requireToken || Boolean(token);
  const data = enabled && canUseToken ? user ?? null : null;
  const isPending = Boolean(enabled && hydrated && canUseToken && !data && !currentUserInitialized && ['idle', 'loading'].includes(currentUserStatus));
  const isError = Boolean(enabled && canUseToken && currentUserStatus === 'error');

  return {
    data,
    hydrated,
    token,
    error: isError ? currentUserError : null,
    isError,
    isLoading: isPending,
    isPending,
    isSuccess: Boolean(data),
    refetch: async () => {
      refreshCurrentUser();
      return { data: useAuthStore.getState().user };
    }
  };
}
