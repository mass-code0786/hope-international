'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { AuctionAdminForm, toAuctionFormValues } from '@/components/auctions/AuctionAdminForm';
import { formatAuctionMoney } from '@/components/auctions/AuctionUi';
import { getAdminAuctionDetails, getAdminProducts, runAdminAuctionAction, updateAdminAuction } from '@/lib/services/admin';
import { queryKeys } from '@/lib/query/queryKeys';
import { number } from '@/lib/utils/format';

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

  const productsQuery = useQuery({
    queryKey: [...queryKeys.adminProducts, 'auction-form'],
    queryFn: () => getAdminProducts({ page: 1, limit: 10, isActive: 'true' })
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

  if (detailQuery.isLoading || productsQuery.isLoading) return <div className="rounded-3xl border border-white/10 bg-card p-6 text-sm text-muted">Loading auction...</div>;
  if (detailQuery.isError) return <ErrorState message="Admin auction details could not be loaded." onRetry={detailQuery.refetch} />;
  if (productsQuery.isError) return <ErrorState message="Products could not be loaded for auction editing." onRetry={productsQuery.refetch} />;

  const auction = detailQuery.data?.data;
  const products = Array.isArray(productsQuery.data?.data) ? productsQuery.data.data : [];
  const initialValues = toAuctionFormValues(auction);
  const sourceMode = auction.product_id ? 'Existing catalog product' : 'Standalone auction item';
  const rewardDistributions = Array.isArray(auction.rewardDistributions) ? auction.rewardDistributions : [];
  const winnerModes = Array.isArray(auction.winner_modes) ? auction.winner_modes : ['highest'];
  const isCashAuction = auction.reward_mode === 'cash' || auction.auction_type === 'cash_amount';
  const perWinnerAmount = Number(auction.cash_prize || auction.each_winner_amount || auction.prize_amount || 0);

  return (
    <div className="space-y-5">
      <AdminSectionHeader title={auction.title} subtitle="Review entry purchases, configured winner rules, resolved winners, and reward settlement." action={<button onClick={() => router.push('/admin/auctions')} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-muted">Back</button>} />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AuctionAdminForm products={products} initialValues={initialValues} onSubmit={(payload) => updateMutation.mutate(payload)} isSaving={updateMutation.isPending} submitLabel="Update Auction" />

        <div className="space-y-4 rounded-3xl border border-white/10 bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={auction.computed_status || auction.status} />
            <p className="text-xs text-muted">Purchase events: {auction.total_bids || 0}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-cardSoft p-4 text-sm text-muted">
            <div className="flex items-center justify-between"><span>Source</span><strong className="text-right text-text">{sourceMode}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Product</span><strong className="text-right text-text">{auction.product_name || 'Auction-only item'}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Entry price</span><strong className="text-text">{formatAuctionMoney(auction.entry_price || auction.display_current_bid)}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Total entries</span><strong className="text-text">{Number(auction.total_entries || 0)}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Participants</span><strong className="text-text">{Number(auction.participantCount || auction.participants?.length || 0)}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Hidden capacity</span><strong className="text-text">{Number(auction.hidden_capacity || 0)}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Category</span><strong className="text-text">{auction.category || 'Not set'}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Condition</span><strong className="text-text">{auction.item_condition || 'Not set'}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Winner target</span><strong className="text-text">{Number(auction.winner_count || 1)}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Winner modes</span><strong className="text-right text-text">{winnerModes.join(' -> ')}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Actual winners</span><strong className="text-text">{Number(auction.actualWinnerCount || auction.winners?.length || 0)}</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Prize type</span><strong className="text-text">{isCashAuction ? 'Cash amount' : 'Product'}</strong></div>
            {isCashAuction ? (
              <>
                <div className="mt-2 flex items-center justify-between"><span>Cash prize</span><strong className="text-text">{formatAuctionMoney(auction.cash_prize || 0)}</strong></div>
                <div className="mt-2 flex items-center justify-between"><span>Each winner</span><strong className="text-text">{formatAuctionMoney(perWinnerAmount)}</strong></div>
              </>
            ) : null}
            <div className="mt-2 flex items-center justify-between"><span>Tie state</span><strong className="text-text">{auction.has_tie ? 'Yes' : 'No'}</strong></div>
            {!isCashAuction ? <div className="mt-2 flex items-center justify-between"><span>Reward mode</span><strong className="text-text">{auction.reward_mode === 'split' ? `Split ${formatAuctionMoney(auction.reward_value || 0)}` : `${auction.stock_quantity || 1} stock`}</strong></div> : null}
            <div className="mt-2 flex items-center justify-between"><span>BTCT price</span><strong className="text-text">{formatAuctionMoney(auction.btctPrice || 0.1)} / BTCT</strong></div>
            <div className="mt-2 flex items-center justify-between"><span>Window</span><strong className="text-right text-text">{new Date(auction.start_at).toLocaleString()} to {new Date(auction.end_at).toLocaleString()}</strong></div>
            {auction.shipping_details ? <p className="mt-3 text-xs leading-5 text-muted">Shipping: {auction.shipping_details}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => actionMutation.mutate({ action: 'activate' })} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">Activate</button>
            <button onClick={() => actionMutation.mutate({ action: 'deactivate' })} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">Deactivate</button>
            <button onClick={() => actionMutation.mutate({ action: 'close', reason: 'Closed by admin' })} className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-300">Close</button>
            <button onClick={() => actionMutation.mutate({ action: 'cancel', reason: 'Cancelled by admin' })} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">Cancel</button>
          </div>

          <div>
            <p className="text-sm font-semibold text-text">Winners</p>
            <div className="mt-3 space-y-2">
              {(auction.winners || []).map((winner) => (
                <div key={winner.user_id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-cardSoft px-3 py-2 text-xs text-muted">
                  <div>
                    <p className="font-semibold text-text">{winner.username}</p>
                    <p>{winner.winner_mode} winner | rank {winner.selection_rank || '-'}</p>
                    <p>{winner.total_entries_snapshot || winner.winning_entry_count} entries | {winner.total_bids_snapshot || 0} bids</p>
                    {winner.prize_type === 'cash_amount' ? <p>{formatAuctionMoney(winner.prize_amount || 0)} credited to withdrawal wallet</p> : null}
                    {winner.credited_at ? <p>Credited {new Date(winner.credited_at).toLocaleString()}</p> : null}
                    {winner.sequence_position ? <p>Sequence position {winner.sequence_position}</p> : null}
                  </div>
                  <strong className="text-sm text-text">{winner.prize_type === 'cash_amount' ? formatAuctionMoney(winner.prize_amount || 0) : (winner.allocation_quantity ?? winner.allocation_ratio)}</strong>
                </div>
              ))}
              {!(auction.winners || []).length ? <p className="text-xs text-muted">No winners yet.</p> : null}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-text">Participants</p>
            <div className="mt-3 space-y-2">
              {(auction.participants || []).slice(0, 12).map((participant) => (
                <div key={participant.user_id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-cardSoft px-3 py-2 text-xs text-muted">
                  <div>
                    <p className="font-semibold text-text">#{participant.rank || '-'} {participant.username}</p>
                    <p>{participant.total_bids} purchase events</p>
                  </div>
                  <div className="text-right">
                    <strong className="text-sm text-text">{participant.total_entries} entries</strong>
                    <p>{formatAuctionMoney(participant.total_spent || 0)} spent</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-text">Distribution Logs</p>
            <div className="mt-3 space-y-2">
              {rewardDistributions.map((entry) => (
                <div key={entry.user_id} className="rounded-2xl border border-white/10 bg-cardSoft px-3 py-2 text-xs text-muted">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-text">{entry.username}</p>
                    <strong className="text-sm text-text">
                      {entry.result_type === 'winner'
                        ? (entry.cash_awarded ? `${formatAuctionMoney(entry.cash_awarded)} cash` : 'Winner')
                        : `${number(entry.btct_awarded || 0)} BTCT`}
                    </strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span>Spent {formatAuctionMoney(entry.amount_spent || 0)}</span>
                    <span>{entry.total_entries || 0} entries</span>
                  </div>
                  {entry.result_type === 'winner' && Array.isArray(entry.metadata?.winnerModes) && entry.metadata.winnerModes.length ? (
                    <p className="mt-1">{entry.metadata.winnerModes.join(', ')} winner</p>
                  ) : null}
                  {entry.cash_awarded ? <p className="mt-1">Wallet credit: {entry.credited_wallet_type || 'withdrawal_wallet'} {entry.wallet_transaction_id ? 'processed' : 'pending'}</p> : null}
                </div>
              ))}
              {!rewardDistributions.length ? <p className="text-xs text-muted">No distribution records yet.</p> : null}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-text">Latest Entry Purchases</p>
            <div className="mt-3 space-y-2">
              {(auction.bidHistory || []).slice(0, 12).map((bid) => (
                <div key={bid.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-cardSoft px-3 py-2 text-xs text-muted">
                  <div>
                    <p className="font-semibold text-text">{bid.username}</p>
                    <p>{new Date(bid.created_at).toLocaleString()}</p>
                  </div>
                  <strong className="text-sm text-text">{bid.entry_count} entries</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
