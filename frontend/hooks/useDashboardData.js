'use client';

import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/services/authService';
import { getWallet } from '@/lib/services/walletService';
import { getWeeklyCompensation, getMonthlyCompensation } from '@/lib/services/compensationService';
import { queryKeys } from '@/lib/query/queryKeys';

export function useDashboardData(cycle, month) {
  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: getMe, retry: 1 });
  const walletQuery = useQuery({ queryKey: queryKeys.wallet, queryFn: getWallet, retry: 1 });
  const weeklyQuery = useQuery({
    queryKey: queryKeys.weeklyCompensation(cycle.cycleStart, cycle.cycleEnd),
    queryFn: () => getWeeklyCompensation(cycle),
    enabled: Boolean(cycle?.cycleStart && cycle?.cycleEnd),
    retry: 1
  });
  const monthlyQuery = useQuery({
    queryKey: queryKeys.monthlyCompensation(month.monthStart, month.monthEnd),
    queryFn: () => getMonthlyCompensation(month),
    enabled: Boolean(month?.monthStart && month?.monthEnd),
    retry: 1
  });

  return {
    meQuery,
    walletQuery,
    weeklyQuery,
    monthlyQuery,
    isLoading: meQuery.isLoading || walletQuery.isLoading || weeklyQuery.isLoading || monthlyQuery.isLoading,
    isError: meQuery.isError || walletQuery.isError || weeklyQuery.isError || monthlyQuery.isError
  };
}
