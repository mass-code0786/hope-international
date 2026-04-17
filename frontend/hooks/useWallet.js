'use client';

import { useQuery } from '@tanstack/react-query';
import { getWallet } from '@/lib/services/walletService';
import { queryKeys } from '@/lib/query/queryKeys';

export function useWallet(options = {}) {
  return useQuery({
    queryKey: queryKeys.wallet,
    queryFn: getWallet,
    enabled: options.enabled ?? true,
    placeholderData: (previousData) => previousData,
    staleTime: 45_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}
