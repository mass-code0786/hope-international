'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getProducts, getProductsList } from '@/lib/services/productsService';
import { queryKeys } from '@/lib/query/queryKeys';
import { HOME_PRODUCTS_LIMIT, LIST_SNAPSHOT_TTL_MS, SHOP_PRODUCTS_PAGE_LIMIT } from '@/lib/constants/catalog';
import { readListSnapshot, writeListSnapshot } from '@/lib/utils/listSnapshot';

const HOME_PRODUCTS_SNAPSHOT_KEY = 'home-products';

function getShopProductsSnapshotKey({ active = true, category, limit = SHOP_PRODUCTS_PAGE_LIMIT, includeTotal = false } = {}) {
  return `shop-products:${active ? 'active' : 'all'}:${category || 'all'}:${limit}:${includeTotal ? 'total' : 'nototal'}`;
}

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
    queryFn: async () => writeListSnapshot(
      HOME_PRODUCTS_SNAPSHOT_KEY,
      await getProductsList({ limit: HOME_PRODUCTS_LIMIT, view: 'card', includeTotal: false })
    ),
    initialData: () => {
      const cached = readListSnapshot(HOME_PRODUCTS_SNAPSHOT_KEY, { maxAgeMs: LIST_SNAPSHOT_TTL_MS });
      if (Array.isArray(cached) && cached.length) {
        return cached;
      }

      const shopSnapshot = readListSnapshot(
        getShopProductsSnapshotKey({ limit: SHOP_PRODUCTS_PAGE_LIMIT, includeTotal: false }),
        { maxAgeMs: LIST_SNAPSHOT_TTL_MS }
      );

      if (Array.isArray(shopSnapshot?.data) && shopSnapshot.data.length) {
        return shopSnapshot.data.slice(0, HOME_PRODUCTS_LIMIT);
      }

      return undefined;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}

export function useInfiniteProducts({ active = true, category, limit = SHOP_PRODUCTS_PAGE_LIMIT, includeTotal = false } = {}) {
  const snapshotKey = getShopProductsSnapshotKey({ active, category, limit, includeTotal });

  return useInfiniteQuery({
    queryKey: [...queryKeys.products, 'infinite', active, category || 'all', limit, includeTotal],
    queryFn: async ({ pageParam = 1 }) => {
      const page = await getProducts({ active, category, page: pageParam, limit, view: 'card', includeTotal });
      if (pageParam === 1) {
        writeListSnapshot(snapshotKey, page);
      }
      return page;
    },
    initialData: () => {
      const cached = readListSnapshot(snapshotKey, { maxAgeMs: LIST_SNAPSHOT_TTL_MS });
      if (!cached) return undefined;
      return {
        pages: [cached],
        pageParams: [1]
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage?.pagination?.nextPage ?? undefined,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}
