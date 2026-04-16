'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/services/authService';
import { queryKeys } from '@/lib/query/queryKeys';
import { useAuthStore } from '@/lib/store/authStore';

const CURRENT_USER_STALE_TIME = 5 * 60 * 1000;

export function useCurrentUser(options = {}) {
  const {
    enabled = true,
    requireToken = true
  } = options;
  const { token, user, hydrated, hydrate, setUser } = useAuthStore();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled: enabled && hydrated && (!requireToken || Boolean(token)) && !user,
    retry: false,
    staleTime: CURRENT_USER_STALE_TIME,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: user || undefined,
    initialDataUpdatedAt: user ? Date.now() : undefined
  });

  useEffect(() => {
    if (query.data && query.data !== user) {
      setUser(query.data);
    }
  }, [query.data, setUser, user]);

  return {
    ...query,
    data: query.data ?? user ?? null,
    hydrated,
    token
  };
}
