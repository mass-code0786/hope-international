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
    mutationFn: (amount) => placeAuctionBid(auctionId, amount),
    onSuccess: async (result) => {
      toast.success(result.message || 'Bid placed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.auctions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auctionDetail(auctionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auctionHistory() })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Bid failed')
  });

  if (detailQuery.isLoading) return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading auction...</div>;
  if (detailQuery.isError) return <ErrorState message="Auction details could not be loaded." onRetry={detailQuery.refetch} />;

  const auction = detailQuery.data?.data;
  const status = auction?.computed_status || auction?.status;
  const nextBid = Math.min(100, Number(auction?.display_current_bid || auction?.current_bid || auction?.starting_price || 0.5) + Number(auction?.min_bid_increment || 0.5));
  const images = auction?.gallery?.length ? auction.gallery : [auction?.image_url].filter(Boolean);

  return (
    <div className="space-y-4">
      <SectionHeader title={auction.title} subtitle="Live bidding, history, and winner visibility" action={<Link href="/auctions" className="text-xs font-semibold text-sky-600">Back</Link>} />

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
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(auction.specifications || []).map((item) => (
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
              <AuctionStatusBadge status={status} won={Boolean(auction.winner_user_id)} />
              <AuctionCountdown startAt={auction.start_at} endAt={auction.end_at} status={status} />
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">Current bid</span><strong className="text-slate-900">{formatAuctionMoney(auction.display_current_bid || auction.current_bid)}</strong></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Starting price</span><strong className="text-slate-900">{formatAuctionMoney(auction.starting_price)}</strong></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Minimum increment</span><strong className="text-slate-900">{formatAuctionMoney(auction.min_bid_increment)}</strong></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Your highest bid</span><strong className="text-slate-900">{formatAuctionMoney(auction.myHighestBid)}</strong></div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => bidMutation.mutate(nextBid)}
                disabled={bidMutation.isPending || status !== 'live'}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {bidMutation.isPending ? 'Submitting bid...' : status === 'live' ? `Place ${formatAuctionMoney(nextBid)} bid` : status === 'upcoming' ? 'Auction not started yet' : 'Bidding closed'}
              </button>
              {auction.winner_user_id ? <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Winner: {auction.winner_username || 'Recorded winner'}</p> : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Bid History</p>
            <div className="mt-3 space-y-2">
              {(auction.bidHistory || []).slice(0, 12).map((bid) => (
                <div key={bid.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-900">{bid.username}</p>
                    <p>{new Date(bid.created_at).toLocaleString()}</p>
                  </div>
                  <strong className="text-sm text-slate-900">{formatAuctionMoney(bid.amount)}</strong>
                </div>
              ))}
              {!(auction.bidHistory || []).length ? <p className="text-xs text-slate-500">No bids yet.</p> : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Participants</p>
            <div className="mt-3 space-y-2">
              {(auction.participants || []).slice(0, 8).map((participant) => (
                <div key={participant.user_id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-900">{participant.username}</p>
                    <p>{participant.total_bids} bids</p>
                  </div>
                  <strong className="text-sm text-slate-900">{formatAuctionMoney(participant.highest_bid)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
