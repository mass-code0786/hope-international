'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { AuctionAdminForm } from '@/components/auctions/AuctionAdminForm';
import { ErrorState } from '@/components/ui/ErrorState';
import { queryKeys } from '@/lib/query/queryKeys';
import { createAdminAuction, getAdminProducts } from '@/lib/services/admin';

export default function AdminNewAuctionPage() {
  const router = useRouter();
  const productsQuery = useQuery({
    queryKey: [...queryKeys.adminProducts, 'auction-form'],
    queryFn: () => getAdminProducts({ page: 1, limit: 200, isActive: 'true' })
  });

  const createMutation = useMutation({
    mutationFn: createAdminAuction,
    onSuccess: (result) => {
      toast.success(result.message || 'Auction created');
      router.push(`/admin/auctions/${result.data?.id}`);
    },
    onError: (error) => toast.error(error.message || 'Auction could not be created')
  });

  if (productsQuery.isLoading) {
    return <div className="rounded-3xl border border-white/10 bg-card p-6 text-sm text-muted">Loading products...</div>;
  }

  if (productsQuery.isError) {
    return <ErrorState message="Products could not be loaded for auction creation." onRetry={productsQuery.refetch} />;
  }

  const products = Array.isArray(productsQuery.data?.data) ? productsQuery.data.data : [];

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="New Auction" subtitle="Select a product, set entry pricing and capacity, and configure deterministic winner rules." />
      <AuctionAdminForm products={products} onSubmit={(payload) => createMutation.mutate(payload)} isSaving={createMutation.isPending} submitLabel="Create Auction" />
    </div>
  );
}
