'use client';

import { useQuery } from '@tanstack/react-query';
import { getOrders } from '@/lib/services/ordersService';
import { queryKeys } from '@/lib/query/queryKeys';

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: getOrders,
    staleTime: 20_000,
    refetchOnWindowFocus: false
  });
}
