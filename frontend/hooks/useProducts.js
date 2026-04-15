'use client';

import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/lib/services/productsService';
import { queryKeys } from '@/lib/query/queryKeys';

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: getProducts,
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}
