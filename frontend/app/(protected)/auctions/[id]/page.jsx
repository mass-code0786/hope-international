'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { AuctionCountdown, AuctionStatusBadge, formatAuctionMoney } from '@/components/auctions/AuctionUi';
import { getAuctionDetails, placeAuctionBid } from '@/lib/services/auctionsService';
import { queryKeys } from '@/lib/query/queryKeys';

function getAuctionImages(auction) {
  const ownGallery = Array.isArray(auction?.gallery) ? auction.gallery.filter(Boolean) : [];
  const productGallery = Array.isArray(auction?.product_gallery) ? auction.product_gallery.filter(Boolean) : [];
  const primary = auction?.image_url || ownGallery[0] || auction?.product_image_url || productGallery[0] || '';
  const rest = [...ownGallery, ...productGallery].filter((item) => item && item !== primary);
  return primary ? [primary, ...rest] : [];
}

export default function AuctionDetailPage() {
  const params = useParams();
  const auctionId = params?.id;
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: queryKeys.auctionDetail(auctionId),
    queryFn: () => getAuctionDetails(auctionId),
    enabled: Boolean(auctionId)
  });

  const bidMutation = useMutation({
    mutationFn: (entryCount) => placeAuctionBid(auctionId, entryCount),
    onSuccess: async (result) => {
      toast.success(result.message || 'Entries purchased');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.auctions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auctionDetail(auctionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auctionHistory() })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Entry purchase failed')
  });

  if (detailQuery.isLoading) return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading auction...</div>;
  if (detailQuery.isError) return <ErrorState message="Auction details could not be loaded." onRetry={detailQuery.refetch} />;

  const auction = detailQuery.data?.data;
  const status = auction?.computed_status || auction?.status;
  const entryPrice = Number(auction?.entry_price || auction?.display_current_bid || auction?.starting_price || 0.5);
  const entryOptions = [1, 3, 5].map((count) => ({ count, total: count * entryPrice }));
  const images = getAuctionImages(auction);
  const detailSpecs = [
    ...(Array.isArray(auction.specifications) ? auction.specifications : []),
    ...(auction.category ? [{ label: 'Category', value: auction.category }] : []),
    ...(auction.item_condition ? [{ label: 'Condition', value: auction.item_condition }] : [])
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title={auction.title} subtitle="Fixed entry highest count auction with hidden capacity" action={<Link href="/auctions" className="text-xs font-semibold text-sky-600">Back</Link>} />

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
            <img src={images[0] || 'https://placehold.co/900x600/e2e8f0/334155?text=Auction'} alt={auction.title} className="h-72 w-full object-cover" />
          </div>
          {images.length > 1 ? (
            <div className="grid grid-cols-3 gap-2">
              {images.slice(1, 4).map((src) => <img key={src} src={src} alt={auction.title} className="h-24 w-full rounded-2xl border border-slate-200 object-cover" />)}
            </div>
          ) : null}
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Details</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{auction.description || auction.short_description || 'No additional details were added for this auction lot.'}</p>
            {auction.shipping_details ? <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600">Shipping: {auction.shipping_details}</p> : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {detailSpecs.map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-2xl bg-slate-50 p-3 text-sm">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{item.label}</p>
                  <p className="mt-1 font-medium text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <AuctionStatusBadge status={status} won={Boolean(auction.isWinner)} />
              <AuctionCountdown startAt={auction.start_at} endAt={auction.end_at} status={status} />
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">Fixed entry price</span><strong className="text-slate-900">{formatAuctionMoney(entryPrice)}</strong></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Your entries</span><strong className="text-slate-900">{Number(auction.myEntryCount || 0)}</strong></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Your spend</span><strong className="text-slate-900">{formatAuctionMoney(auction.myTotalSpend || 0)}</strong></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Reward mode</span><strong className="text-slate-900">{auction.reward_mode === 'split' ? 'Shared reward' : `${auction.stock_quantity || 1} stock`}</strong></div>
            </div>

            <div className="mt-4 space-y-2">
              {entryOptions.map((option) => (
                <button key={option.count} onClick={() => bidMutation.mutate(option.count)} disabled={bidMutation.isPending || status !== 'live'} className="flex w-full items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                  <span>{status === 'live' ? `Buy ${option.count} entr${option.count > 1 ? 'ies' : 'y'}` : status === 'upcoming' ? 'Auction not started yet' : 'Entries closed'}</span>
                  <span>{formatAuctionMoney(option.total)}</span>
                </button>
              ))}
              {Array.isArray(auction.winners) && auction.winners.length > 0 ? <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Winners: {auction.winners.map((winner) => winner.username).join(', ')}</div> : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Entry History</p>
            <div className="mt-3 space-y-2">
              {(auction.bidHistory || []).slice(0, 12).map((bid) => (
                <div key={bid.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-900">{bid.username}</p>
                    <p>{new Date(bid.created_at).toLocaleString()}</p>
                  </div>
                  <strong className="text-sm text-slate-900">{bid.entry_count} entries</strong>
                </div>
              ))}
              {!(auction.bidHistory || []).length ? <p className="text-xs text-slate-500">No entries yet.</p> : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Leaderboard</p>
            <div className="mt-3 space-y-2">
              {(auction.participants || []).slice(0, 8).map((participant) => (
                <div key={participant.user_id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-900">{participant.username}</p>
                    <p>{participant.total_bids} purchase events</p>
                  </div>
                  <strong className="text-sm text-slate-900">{participant.total_entries} entries</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
