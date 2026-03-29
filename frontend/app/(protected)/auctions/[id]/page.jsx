'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BadgeInfo, Clock3, Gavel, Package, ShieldCheck, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
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

function DetailCard({ title, children, action = null }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function InfoPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
        <Icon size={11} />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function WinnerNote({ auction }) {
  const winners = Array.isArray(auction?.winners) ? auction.winners : [];
  if (!winners.length) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
      <p className="font-semibold">Result declared</p>
      <p className="mt-1 text-xs leading-5">Winner{winners.length > 1 ? 's' : ''}: {winners.map((winner) => winner.username).join(', ')}</p>
    </div>
  );
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
  const heroImage = images[0] || 'https://placehold.co/1200x1200/e2e8f0/334155?text=Auction';
  const detailSpecs = [
    ...(Array.isArray(auction?.specifications) ? auction.specifications : []),
    ...(auction?.category ? [{ label: 'Category', value: auction.category }] : []),
    ...(auction?.item_condition ? [{ label: 'Condition', value: auction.item_condition }] : [])
  ];
  const isLive = status === 'live';
  const isEnded = status === 'ended';
  const winners = Array.isArray(auction?.winners) ? auction.winners : [];

  return (
    <div className="-mx-4 bg-[#f8fafc] px-3 pb-28 pt-0 sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-200 sm:px-4 sm:py-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/auctions" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.05)]">
            <ArrowLeft size={14} />
            Back
          </Link>
          <AuctionStatusBadge status={status} won={Boolean(auction?.isWinner)} />
        </div>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.7),_transparent_45%),linear-gradient(180deg,#f8fafc,#eef2ff)]">
            <img src={heroImage} alt={auction?.title || 'Auction'} className="h-[340px] w-full object-contain p-4 sm:h-[420px]" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/22 via-slate-950/6 to-transparent p-3">
              <div className="rounded-2xl bg-white/90 p-3 shadow-[0_10px_28px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Entry Price</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{formatAuctionMoney(entryPrice)}</p>
              </div>
            </div>
          </div>
          {images.length > 1 ? (
            <div className="grid grid-cols-4 gap-2 border-t border-slate-100 p-3">
              {images.slice(1, 5).map((src) => (
                <div key={src} className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                  <img src={src} alt={auction?.title || 'Auction gallery'} className="h-20 w-full object-contain p-1.5" />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700">Auction Product</p>
          <h1 className="mt-2 text-2xl font-semibold leading-8 text-slate-900">{auction?.title}</h1>
          {auction?.short_description ? <p className="mt-2 text-sm leading-6 text-slate-500">{auction.short_description}</p> : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <InfoPill icon={Gavel} label="Entry Price" value={formatAuctionMoney(entryPrice)} />
            <InfoPill icon={Users} label="Your Entries" value={Number(auction?.myEntryCount || 0)} />
            <InfoPill icon={Package} label="Reward" value={auction?.reward_mode === 'split' ? 'Shared reward' : `${auction?.stock_quantity || 1} stock`} />
            <InfoPill icon={Clock3} label={status === 'upcoming' ? 'Starts' : 'Ends'} value={<span><AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} compact /></span>} />
          </div>
        </section>

        <DetailCard title="Auction Status">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
              <div>
                <p className="text-xs text-slate-500">Current status</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{String(status || 'upcoming').toUpperCase()}</p>
              </div>
              <AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-slate-50 px-3 py-3"><p className="text-xs text-slate-500">Your spend</p><p className="mt-1 font-semibold text-slate-900">{formatAuctionMoney(auction?.myTotalSpend || 0)}</p></div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3"><p className="text-xs text-slate-500">Auction status</p><p className="mt-1 font-semibold text-slate-900">{isLive ? 'Open for entries' : isEnded ? 'Closed' : 'Scheduled'}</p></div>
            </div>
            <WinnerNote auction={auction} />
          </div>
        </DetailCard>

        <DetailCard title="About This Item">
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-600">{auction?.description || auction?.short_description || 'No additional details were added for this auction item.'}</p>
            {detailSpecs.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {detailSpecs.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="rounded-2xl bg-slate-50 p-3 text-sm">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{item.label}</p>
                    <p className="mt-1 font-medium text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {auction?.shipping_details ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Shipping / Claim Info</p>
                <p className="mt-1 leading-6">{auction.shipping_details}</p>
              </div>
            ) : null}
          </div>
        </DetailCard>

        <DetailCard title="Your Participation">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-slate-50 px-3 py-3"><p className="text-xs text-slate-500">Entries bought</p><p className="mt-1 font-semibold text-slate-900">{Number(auction?.myEntryCount || 0)}</p></div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3"><p className="text-xs text-slate-500">Total spent</p><p className="mt-1 font-semibold text-slate-900">{formatAuctionMoney(auction?.myTotalSpend || 0)}</p></div>
          </div>
        </DetailCard>

        {(auction?.bidHistory || []).length ? (
          <DetailCard title="Recent Bids">
            <div className="space-y-2">
              {(auction.bidHistory || []).slice(0, 8).map((bid) => (
                <div key={bid.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-900">{bid.username}</p>
                    <p>{new Date(bid.created_at).toLocaleString()}</p>
                  </div>
                  <strong className="text-sm text-slate-900">{bid.entry_count} entries</strong>
                </div>
              ))}
            </div>
          </DetailCard>
        ) : null}

        <DetailCard title="How It Works">
          <div className="space-y-2 text-sm leading-6 text-slate-600">
            <p className="flex gap-2"><ShieldCheck size={16} className="mt-1 shrink-0 text-sky-600" />Each entry uses the fixed price shown above.</p>
            <p className="flex gap-2"><BadgeInfo size={16} className="mt-1 shrink-0 text-sky-600" />The hidden capacity is not shown publicly and closes the auction automatically.</p>
            <p className="flex gap-2"><Trophy size={16} className="mt-1 shrink-0 text-sky-600" />When the auction closes, the highest total entry count wins. Ties can produce multiple winners.</p>
          </div>
        </DetailCard>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur md:hidden">
        {isLive ? (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-2xl bg-slate-100 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Entry Price</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{formatAuctionMoney(entryPrice)}</p>
            </div>
            <button onClick={() => bidMutation.mutate(1)} disabled={bidMutation.isPending} className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.22)] disabled:cursor-not-allowed disabled:bg-slate-300">
              {bidMutation.isPending ? 'Processing...' : 'Place Bid'}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
            {isEnded ? (winners.length ? `Auction ended. Winner${winners.length > 1 ? 's' : ''}: ${winners.map((winner) => winner.username).join(', ')}` : 'Auction ended. Results will appear here once declared.') : 'Auction has not started yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
