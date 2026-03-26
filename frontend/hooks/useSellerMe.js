'use client';

import { useQuery } from '@tanstack/react-query';
import { getSellerMe } from '@/lib/services/sellerService';
import { queryKeys } from '@/lib/query/queryKeys';

export function useSellerMe(options = {}) {
  return useQuery({
    queryKey: queryKeys.sellerMe,
    queryFn: getSellerMe,
    retry: false,
    ...options
  });
}
