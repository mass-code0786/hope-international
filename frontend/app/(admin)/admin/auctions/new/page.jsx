'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { AuctionAdminForm } from '@/components/auctions/AuctionAdminForm';
import { createAdminAuction } from '@/lib/services/admin';

export default function AdminNewAuctionPage() {
  const router = useRouter();
  const createMutation = useMutation({
    mutationFn: createAdminAuction,
    onSuccess: (result) => {
      toast.success(result.message || 'Auction created');
      router.push(`/admin/auctions/${result.data?.id}`);
    },
    onError: (error) => toast.error(error.message || 'Auction could not be created')
  });

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="New Auction" subtitle="Admin-managed image, pricing, timing, and winner flow" />
      <AuctionAdminForm onSubmit={(payload) => createMutation.mutate(payload)} isSaving={createMutation.isPending} submitLabel="Create Auction" />
    </div>
  );
}
