'use client';

import { useMemo } from 'react';
import { useSellerMe } from '@/hooks/useSellerMe';

export function useSellerProducts() {
  const sellerQuery = useSellerMe();

  const products = useMemo(() => {
    return Array.isArray(sellerQuery.data?.products) ? sellerQuery.data.products : [];
  }, [sellerQuery.data?.products]);

  return {
    ...sellerQuery,
    products
  };
}
