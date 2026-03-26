'use client';

import { useQuery } from '@tanstack/react-query';
import { getWallet } from '@/lib/services/walletService';
import { queryKeys } from '@/lib/query/queryKeys';

export function useWallet() {
  return useQuery({
    queryKey: queryKeys.wallet,
    queryFn: getWallet
  });
}
