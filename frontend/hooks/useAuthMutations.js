'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, register } from '@/lib/services/authService';
import { useAuthStore } from '@/lib/store/authStore';
import { queryKeys } from '@/lib/query/queryKeys';

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
      if (process.env.NODE_ENV !== 'production') {
        console.info('[frontend.auth.login] response role', { username: data?.user?.username, role: data?.user?.role });
      }
      setSession({ token: data.token, user: data.user });
      await refreshCoreQueries(data.user);
    },
    onError: (err) => setError(err.message)
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: async (data) => {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[frontend.auth.register] response role', { username: data?.user?.username, role: data?.user?.role });
      }
      setSession({ token: data.token, user: data.user });
      await refreshCoreQueries(data.user);
    },
    onError: (err) => setError(err.message)
  });

  return {
    loginMutation,
    registerMutation,
    error,
    setError
  };
}
