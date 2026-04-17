'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const canUseToken = !requireToken || Boolean(token);
  const cachedUser = canUseToken ? (queryClient.getQueryData(queryKeys.me) ?? null) : null;
  const resolvedUser = canUseToken ? (user ?? cachedUser ?? null) : null;

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled: enabled && hydrated && canUseToken && !resolvedUser,
    retry: false,
    staleTime: CURRENT_USER_STALE_TIME,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: resolvedUser || undefined,
    initialDataUpdatedAt: resolvedUser ? Date.now() : undefined
  });

  useEffect(() => {
    if (query.data && query.data !== user) {
      setUser(query.data);
    }
  }, [query.data, setUser, user]);

  return {
    ...query,
    data: query.data ?? resolvedUser,
    hydrated,
    token
  };
}
