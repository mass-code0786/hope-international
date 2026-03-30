'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, register } from '@/lib/services/authService';
import { useAuthStore } from '@/lib/store/authStore';
import { queryKeys } from '@/lib/query/queryKeys';

function buildRegistrationSummary(user) {
  if (!user) return null;

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || 'Hope Member';
  const sponsorName = [user.sponsor_first_name, user.sponsor_last_name].filter(Boolean).join(' ').trim();
  const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const referralLink = user.username ? `${appUrl}/register?ref=${encodeURIComponent(user.username)}` : '';

  return {
    fullName,
    username: user.username || '',
    memberId: user.member_id || user.id || '',
    sponsorName: sponsorName || user.sponsor_username || 'Unassigned',
    sponsorUsername: user.sponsor_username || '',
    placementSide: user.placement_side || 'Pending',
    email: user.email || '',
    mobileNumber: [user.country_code, user.mobile_number].filter(Boolean).join(' '),
    registrationDate: user.created_at || new Date().toISOString(),
    role: user.role || 'user',
    loginUsername: user.username || '',
    accountStatus: user.is_active === false ? 'Inactive' : 'Active',
    referralLink
  };
}

export function useAuthMutations() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const setRegistrationSummary = useAuthStore((s) => s.setRegistrationSummary);
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
      setRegistrationSummary(data?.registrationSummary || buildRegistrationSummary(data?.user));
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
