'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSellerMe } from '@/hooks/useSellerMe';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { canAccessSellerArea } from '@/lib/constants/access';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

export function SellerGuard({ children }) {
  const meQuery = useCurrentUser();
  const sellerQuery = useSellerMe({ enabled: Boolean(meQuery.data) });

  const isLoading = meQuery.isLoading || sellerQuery.isLoading;
  const isError = meQuery.isError || sellerQuery.isError;
  const canAccess = useMemo(() => canAccessSellerArea(meQuery.data, sellerQuery.data), [meQuery.data, sellerQuery.data]);

  if (isLoading) return null;
  if (isError) return <ErrorState message="Seller access validation failed. Please retry." onRetry={sellerQuery.refetch} />;

  if (!canAccess) {
    return (
      <EmptyState
        title="Seller access not active yet"
        description="Submit your seller application to unlock product management and seller analytics."
        action={
          <Link href="/seller/apply" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black">
            Apply for Seller
          </Link>
        }
      />
    );
  }

  return children;
}
