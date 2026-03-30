'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BadgeInfo, ChevronLeft, ChevronRight, Clock3, Gavel, ShieldCheck, Sparkles, Tag, Trophy } from 'lucide-react';
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

function MiniInfo({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        <Icon size={11} />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function HelpRow({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-2 rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
        <Icon size={14} />
      </span>
      <p className="text-sm leading-5 text-slate-600">{children}</p>
    </div>
  );
}

function Gallery({ images, title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeImages = images.length ? images : ['https://placehold.co/1200x1200/e2e8f0/334155?text=Auction'];
  const active = safeImages[activeIndex] || safeImages[0];
  const canMove = safeImages.length > 1;

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.10)]">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.32),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(251,113,133,0.18),_transparent_28%),linear-gradient(180deg,#ffffff,#eef2ff)] px-3 pb-4 pt-4">
        <img src={active} alt={title || 'Auction'} className="mx-auto h-[300px] w-full object-contain sm:h-[420px]" />
        {canMove ? (
          <>
            <button onClick={() => setActiveIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length)} className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm" aria-label="Previous image">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setActiveIndex((prev) => (prev + 1) % safeImages.length)} className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm" aria-label="Next image">
              <ChevronRight size={16} />
            </button>
          </>
        ) : null}
      </div>
      {canMove ? (
        <div className="flex items-center justify-center gap-1.5 px-3 pb-4">
          {safeImages.map((image, index) => (
            <button key={`${image}-${index}`} onClick={() => setActiveIndex(index)} className={`h-2 rounded-full transition-all ${index == activeIndex ? 'w-5 bg-slate-900' : 'w-2 bg-slate-300'}`} aria-label={`Show image ${index + 1}`} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StickyBidBar({ isLive, isEnded, entryPrice, bidMutation, winners }) {
  return (
    <div className="fixed inset-x-0 bottom-[56px] z-30 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:left-1/2 md:w-full md:max-w-3xl md:-translate-x-1/2 md:px-4">
      <div className="rounded-[28px] border border-white/80 bg-white/96 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.18)] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 rounded-[20px] bg-slate-100 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Entry Price</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatAuctionMoney(entryPrice)}</p>
          </div>
          {isLive ? (
            <button onClick={() => bidMutation.mutate(1)} disabled={bidMutation.isPending} className="inline-flex min-h-[56px] min-w-[138px] items-center justify-center rounded-[20px] bg-slate-900 px-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.22)] disabled:cursor-not-allowed disabled:bg-slate-300">
              {bidMutation.isPending ? 'Processing...' : 'Bid Now'}
            </button>
          ) : (
            <div className="min-h-[56px] min-w-[138px] rounded-[20px] bg-slate-900 px-4 py-3 text-center text-xs font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]">
              {isEnded ? (winners.length ? 'Result Ready' : 'Auction Ended') : 'Coming Soon'}
            </div>
          )}
        </div>
      </div>
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

  if (detailQuery.isLoading) return <div className="rounded-[30px] border border-white/80 bg-white p-6 text-sm text-slate-500 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">Loading auction...</div>;
  if (detailQuery.isError) return <ErrorState message="Auction details could not be loaded." onRetry={detailQuery.refetch} />;

  const auction = detailQuery.data?.data;
  const status = auction?.computed_status || auction?.status;
  const entryPrice = Number(auction?.entry_price || auction?.display_current_bid || auction?.starting_price || 0.5);
  const images = getAuctionImages(auction);
  const isLive = status === 'live';
  const isEnded = status === 'ended';
  const winners = Array.isArray(auction?.winners) ? auction.winners : [];

  const itemFacts = useMemo(() => ([
    auction?.short_description ? { label: 'About', value: auction.short_description, icon: Sparkles } : null,
    auction?.category ? { label: 'Category', value: auction.category, icon: Tag } : null,
    auction?.item_condition ? { label: 'Condition', value: auction.item_condition, icon: ShieldCheck } : null
  ].filter(Boolean)), [auction?.short_description, auction?.category, auction?.item_condition]);

  return (
    <>
      <div className="-mx-4 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.18),_transparent_28%),linear-gradient(180deg,#f8fafc,#eef2ff_50%,#f8fafc)] px-3 pb-[190px] pt-0 sm:mx-0 sm:rounded-[30px] sm:border sm:border-slate-200/80 sm:px-4 sm:py-4 sm:pb-[190px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/auctions" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
              <ArrowLeft size={14} />
              Back
            </Link>
            <AuctionStatusBadge status={status} won={Boolean(auction?.isWinner || auction?.is_winner)} />
          </div>

          <Gallery images={images} title={auction?.title} />

          <section className="rounded-[30px] border border-white/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Auction Lot</p>
                <h1 className="mt-2 text-[24px] font-semibold leading-8 text-slate-900">{auction?.title || 'Untitled auction'}</h1>
              </div>
              <div className="shrink-0 rounded-[22px] bg-slate-900 px-3 py-2 text-right text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/65">Entry</p>
                <p className="mt-1 text-lg font-semibold">{formatAuctionMoney(entryPrice)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] bg-[linear-gradient(135deg,#0f172a,#1e293b)] p-4 text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">Countdown</p>
                  <p className="mt-1 text-sm text-white/75">{isLive ? 'Bidding is live now' : isEnded ? 'Auction closed' : 'Auction opens soon'}</p>
                </div>
                <AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} />
              </div>
            </div>
          </section>

          {itemFacts.length ? (
            <section className="space-y-3 rounded-[30px] border border-white/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">About This Item</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Quick details</h2>
              </div>
              <div className="grid gap-2">
                {itemFacts.map((item) => (
                  <MiniInfo key={`${item.label}-${item.value}`} icon={item.icon} label={item.label} value={item.value} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3 rounded-[30px] border border-white/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">How It Works</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Simple auction flow</h2>
            </div>
            <div className="space-y-2">
              <HelpRow icon={Gavel}>Each entry uses the fixed price shown for this auction.</HelpRow>
              <HelpRow icon={Trophy}>When the timer ends, the highest total entries win the lot.</HelpRow>
              <HelpRow icon={BadgeInfo}>If totals tie, multiple winners can be declared for that round.</HelpRow>
            </div>
          </section>

          {isEnded && winners.length ? (
            <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-[0_12px_28px_rgba(16,185,129,0.10)]">
              Winner{winners.length > 1 ? 's' : ''}: {winners.map((winner) => winner.username).join(', ')}
            </section>
          ) : null}
        </div>
      </div>

      <StickyBidBar isLive={isLive} isEnded={isEnded} entryPrice={entryPrice} bidMutation={bidMutation} winners={winners} />
    </>
  );
}
