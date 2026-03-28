'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { AuctionAdminForm, toAuctionFormValues } from '@/components/auctions/AuctionAdminForm';
import { formatAuctionMoney } from '@/components/auctions/AuctionUi';
import { getAdminAuctionDetails, runAdminAuctionAction, updateAdminAuction } from '@/lib/services/admin';
import { queryKeys } from '@/lib/query/queryKeys';

export default function AdminAuctionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const auctionId = params?.id;

  const detailQuery = useQuery({
    queryKey: queryKeys.adminAuctionDetail(auctionId),
    queryFn: () => getAdminAuctionDetails(auctionId),
    enabled: Boolean(auctionId)
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => updateAdminAuction(auctionId, payload),
    onSuccess: async (result) => {
      toast.success(result.message || 'Auction updated');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminAuctions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminAuctionDetail(auctionId) })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Auction update failed')
  });

  const actionMutation = useMutation({
    mutationFn: (payload) => runAdminAuctionAction(auctionId, payload),
    onSuccess: async (result) => {
      toast.success(result.message || 'Auction updated');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminAuctions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminAuctionDetail(auctionId) })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Auction action failed')
  });

  if (detailQuery.isLoading) return <div className="rounded-3xl border border-white/10 bg-card p-6 text-sm text-muted">Loading auction...</div>;
  if (detailQuery.isError) return <ErrorState message="Admin auction details could not be loaded." onRetry={detailQuery.refetch} />;

  const auction = detailQuery.data?.data;
  const initialValues = useMemo(() => toAuctionFormValues(auction), [auction]);

  return (
    <div className="space-y-5">
      <AdminSectionHeader title={auction.title} subtitle="Review bids, participants, winner, and admin controls" action={<button onClick={() => router.push('/admin/auctions')} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-muted">Back</button>} />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AuctionAdminForm initialValues={initialValues} onSubmit={(payload) => updateMutation.mutate(payload)} isSaving={updateMutation.isPending} submitLabel="Update Auction" />

        <div className="space-y-4 rounded-3xl border border-white/10 bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={auction.computed_status || auction.status} />
            <p className="text-xs text-muted">Total bids: {auction.total_bids || 0}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-cardSoft p-4 text-sm text-muted">
            <div className="flex items-center justify-between"><span>Current bid</span><strong className="text-text">{formatAuctionMoney(auction.display_current_bid || auction.current_bid)}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Winner</span><strong className="text-text">{auction.winner_username || '-'}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Window</span><strong className="text-text">{new Date(auction.start_at).toLocaleString()} to {new Date(auction.end_at).toLocaleString()}</strong></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => actionMutation.mutate({ action: 'activate' })} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Activate</button>
            <button onClick={() => actionMutation.mutate({ action: 'deactivate' })} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">Deactivate</button>
            <button onClick={() => actionMutation.mutate({ action: 'close', reason: 'Closed by admin' })} className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-300">Close</button>
            <button onClick={() => actionMutation.mutate({ action: 'cancel', reason: 'Cancelled by admin' })} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">Cancel</button>
          </div>

          <div>
            <p className="text-sm font-semibold text-text">Participants</p>
            <div className="mt-3 space-y-2">
              {(auction.participants || []).slice(0, 12).map((participant) => (
                <div key={participant.user_id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-cardSoft px-3 py-2 text-xs text-muted">
                  <div>
                    <p className="font-semibold text-text">{participant.username}</p>
                    <p>{participant.total_bids} bids</p>
                  </div>
                  <strong className="text-sm text-text">{formatAuctionMoney(participant.highest_bid)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-text">Latest Bids</p>
            <div className="mt-3 space-y-2">
              {(auction.bidHistory || []).slice(0, 12).map((bid) => (
                <div key={bid.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-cardSoft px-3 py-2 text-xs text-muted">
                  <div>
                    <p className="font-semibold text-text">{bid.username}</p>
                    <p>{new Date(bid.created_at).toLocaleString()}</p>
                  </div>
                  <strong className="text-sm text-text">{formatAuctionMoney(bid.amount)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
