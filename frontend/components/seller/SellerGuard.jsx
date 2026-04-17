'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSellerMe } from '@/hooks/useSellerMe';
import { useSessionUser } from '@/hooks/useSessionUser';
import { canAccessSellerArea } from '@/lib/constants/access';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoadingState } from '@/components/ui/PageLoadingState';

export function SellerGuard({ children }) {
  const sessionUser = useSessionUser();
  const sellerQuery = useSellerMe({ enabled: Boolean(sessionUser.token) });

  const isLoading = sessionUser.isLoading || sellerQuery.isLoading;
  const isError = sellerQuery.isError;
  const canAccess = useMemo(() => canAccessSellerArea(sessionUser.data, sellerQuery.data), [sessionUser.data, sellerQuery.data]);

  if (isLoading) return <PageLoadingState title="Seller" subtitle="Checking seller access." />;
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
