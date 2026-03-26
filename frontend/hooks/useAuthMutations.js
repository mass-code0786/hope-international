'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { demoLogin, login, register } from '@/lib/services/authService';
import { useAuthStore } from '@/lib/store/authStore';
import { queryKeys } from '@/lib/query/queryKeys';
import { getDemoRedirectPath } from '@/lib/utils/demoSession';

export function useAuthMutations() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState('');

  async function refreshCoreQueries(user) {
    queryClient.setQueryData(queryKeys.me, user);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.me }),
      queryClient.invalidateQueries({ queryKey: queryKeys.sellerMe }),
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
      queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyCompensationRoot }),
      queryClient.invalidateQueries({ queryKey: queryKeys.monthlyCompensationRoot }),
      queryClient.invalidateQueries({ queryKey: queryKeys.teamChildren })
    ]);
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (data) => {
      setSession({ token: data.token, user: data.user });
      await refreshCoreQueries(data.user);
    },
    onError: (err) => setError(err.message)
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: async (data) => {
      setSession({ token: data.token, user: data.user });
      await refreshCoreQueries(data.user);
    },
    onError: (err) => setError(err.message)
  });

  const demoLoginMutation = useMutation({
    mutationFn: demoLogin,
    onSuccess: async (data) => {
      setSession({ token: data.token, user: data.user });
      await refreshCoreQueries(data.user);
    },
    onError: (err) => setError(err.message)
  });

  return {
    loginMutation,
    registerMutation,
    demoLoginMutation,
    getDemoRedirectPath,
    error,
    setError
  };
}
