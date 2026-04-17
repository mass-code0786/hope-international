'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getProducts, getProductsList } from '@/lib/services/productsService';
import { queryKeys } from '@/lib/query/queryKeys';

export function useProducts(params = {}) {
  return useQuery({
    queryKey: [...queryKeys.products, 'list', params.active ?? true, params.category || 'all', params.limit || 20],
    queryFn: () => getProductsList(params),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

export function useHomeProducts() {
  return useQuery({
    queryKey: queryKeys.homeProducts,
    queryFn: () => getProductsList({ limit: 8, view: 'card', includeTotal: false }),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

export function useInfiniteProducts({ active = true, category, limit = 12 } = {}) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.products, 'infinite', active, category || 'all', limit],
    queryFn: ({ pageParam = 1 }) => getProducts({ active, category, page: pageParam, limit, view: 'card', includeTotal: false }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage?.pagination?.nextPage ?? undefined,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}
