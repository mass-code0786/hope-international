'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';

export function useSessionUser() {
  const { token, user, hydrated, hydrate } = useAuthStore();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const isPending = !hydrated || (Boolean(token) && !user);

  return {
    data: user ?? null,
    hydrated,
    token,
    isPending,
    isLoading: isPending,
    isError: false
  };
}
