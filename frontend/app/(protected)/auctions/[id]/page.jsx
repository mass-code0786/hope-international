'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, Gavel, Medal, Rocket, Share2, ShieldCheck, Sparkles, Trophy, Users, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { ErrorState } from '@/components/ui/ErrorState';
import { AuctionCountdown, AuctionStatusBadge, formatAuctionMoney } from '@/components/auctions/AuctionUi';
import { getAuctionDetails, placeAuctionBid, revealAuctionResult } from '@/lib/services/auctionsService';
import { getWallet } from '@/lib/services/walletService';
import { queryKeys } from '@/lib/query/queryKeys';
import { number } from '@/lib/utils/format';

function getAuctionImages(auction) {
  const ownGallery = Array.isArray(auction?.gallery) ? auction.gallery.filter(Boolean) : [];
  const productGallery = Array.isArray(auction?.product_gallery) ? auction.product_gallery.filter(Boolean) : [];
  const primary = auction?.image_url || ownGallery[0] || auction?.product_image_url || productGallery[0] || '';
  const rest = [...ownGallery, ...productGallery].filter((item) => item && item !== primary);
  return primary ? [primary, ...rest] : [];
}

function Gallery({ images, title, status, participants, latestBidder }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeImages = images.length ? images : ['https://placehold.co/1200x1200/e2e8f0/334155?text=Auction'];
  const active = safeImages[activeIndex] || safeImages[0];
  const canMove = safeImages.length > 1;

  return (
    <section className="overflow-hidden rounded-[34px] border border-white/80 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.12)]">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.32),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,113,133,0.18),_transparent_32%),linear-gradient(180deg,#ffffff,#eef2ff)] px-3 pb-5 pt-4">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-3 py-3">
          <AuctionStatusBadge status={status} />
          <div className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[10px] font-semibold text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            {participants} watching live
          </div>
        </div>

        <img src={active} alt={title || 'Auction'} className="mx-auto h-[312px] w-full object-contain sm:h-[420px]" />

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

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="shrink-0 rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-[0_12px_26px_rgba(15,23,42,0.16)]">
            <span className="text-white/65">Activity</span>
            <span className="ml-2">{latestBidder?.username || 'Waiting for the next entry'}</span>
          </div>
          <div className="shrink-0 rounded-full border border-slate-200 bg-white/92 px-3 py-2 text-[11px] font-semibold text-slate-700">
            Latest {latestBidder ? `${latestBidder.entry_count} entries` : 'No entries yet'}
          </div>
        </div>
      </div>
      {canMove ? (
        <div className="flex items-center justify-center gap-1.5 px-3 pb-4">
          {safeImages.map((image, index) => (
            <button key={`${image}-${index}`} onClick={() => setActiveIndex(index)} className={`h-2 rounded-full transition-all ${index === activeIndex ? 'w-5 bg-slate-900' : 'w-2 bg-slate-300'}`} aria-label={`Show image ${index + 1}`} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StatTile({ icon: Icon, label, value, tone = 'default' }) {
  const toneClasses = tone === 'dark'
    ? 'bg-slate-900 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]'
    : tone === 'sky'
      ? 'bg-sky-50 text-slate-900'
      : 'bg-white text-slate-900';

  return (
    <div className={`rounded-[24px] border border-white/80 px-4 py-4 ${toneClasses}`}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
        <Icon size={13} />
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function LeaderboardCard({ leaderboard = [], myPosition, myEntryCount }) {
  return (
    <section className="rounded-[30px] border border-white/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Live Leaderboard</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Current top participants</h2>
        </div>
        <div className="rounded-[18px] bg-slate-900 px-3 py-2 text-right text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Your Rank</p>
          <p className="mt-1 text-base font-semibold">{myPosition ? `#${myPosition}` : 'Unranked'}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {leaderboard.length ? leaderboard.map((entry) => (
          <div key={entry.user_id} className={`flex items-center gap-3 rounded-[22px] px-3 py-3 ${entry.is_current_user ? 'bg-slate-900 text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]' : 'border border-slate-200 bg-slate-50 text-slate-800'}`}>
            <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${entry.is_current_user ? 'bg-white/12 text-white' : 'bg-white text-slate-900'}`}>#{entry.rank}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{entry.username}</p>
              <p className={`text-[11px] ${entry.is_current_user ? 'text-white/70' : 'text-slate-500'}`}>{entry.total_bids} purchase events</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{entry.total_entries}</p>
              <p className={`text-[10px] uppercase tracking-[0.16em] ${entry.is_current_user ? 'text-white/60' : 'text-slate-400'}`}>entries</p>
            </div>
          </div>
        )) : <p className="rounded-[22px] border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">Leaderboard will populate after the first entries arrive.</p>}
      </div>

      <div className="mt-3 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
        Your total entries in this auction: <span className="font-semibold text-slate-900">{myEntryCount}</span>
      </div>
    </section>
  );
}

function FactCard({ title, children }) {
  return (
    <section className="rounded-[30px] border border-white/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">{title}</p>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ResultRevealSection({ auction, winners, onReveal, revealMutation }) {
  const alreadyRevealed = Boolean(auction?.resultReveal?.revealed_at);
  const eligible = Boolean(auction?.revealEligible);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(alreadyRevealed);

  useEffect(() => {
    if (alreadyRevealed) setRevealed(true);
  }, [alreadyRevealed]);

  const handleReveal = async () => {
    if (!eligible || spinning || revealMutation.isPending) return;
    setSpinning(true);
    window.setTimeout(async () => {
      try {
        await onReveal();
        setRevealed(true);
      } finally {
        setSpinning(false);
      }
    }, 1800);
  };

  if (!eligible && !alreadyRevealed) return null;

  return (
    <FactCard title="Result Reveal">
      <div className="space-y-4">
        <div className="rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.28),_transparent_30%),linear-gradient(135deg,#0f172a,#1e293b)] px-4 py-5 text-white shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Prize Distributed</p>
              <h3 className="mt-1 text-lg font-semibold">{revealed ? 'Winner Revealed' : 'Spin to Reveal Winner'}</h3>
              <p className="mt-2 text-sm text-white/72">This wheel reveals the already finalized auction result. It does not affect winner selection.</p>
            </div>
            <button
              onClick={handleReveal}
              disabled={!eligible || spinning || revealMutation.isPending || revealed}
              className={`relative inline-flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white/20 bg-[conic-gradient(from_90deg,_#f97316,_#facc15,_#38bdf8,_#a855f7,_#f97316)] shadow-[0_16px_32px_rgba(15,23,42,0.24)] ${spinning ? 'animate-[spin_1.8s_linear]' : ''} disabled:opacity-75`}
              aria-label="Spin to reveal winner"
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white text-xs font-semibold">{revealed ? 'Done' : 'Spin'}</span>
            </button>
          </div>
        </div>

        {revealed ? (
          <div className={`rounded-[24px] border px-4 py-4 text-sm shadow-[0_12px_28px_rgba(15,23,42,0.08)] ${auction?.isWinner ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            <p className="font-semibold">{auction?.isWinner ? 'You Won' : winners.length > 1 ? 'Winners Revealed' : 'Winner Revealed'}</p>
            <p className="mt-1">{winners.length > 1 ? `Winners: ${winners.map((winner) => winner.username).join(', ')}` : `Winner: ${winners[0]?.username || 'Unavailable'}`}</p>
            <p className="mt-2 text-xs opacity-70">Auction closed and prize distribution finalized.</p>
          </div>
        ) : (
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Tap the wheel once to reveal the finalized winner{winners.length > 1 ? 's' : ''} for this auction.
          </div>
        )}
      </div>
    </FactCard>
  );
}

function StickyBidBar({ status, entryPrice, walletBalance, bidMutation, onBid, winners }) {
  const quickCounts = [1, 5, 10];
  const isLive = status === 'live';
  const isEnded = status === 'ended';

  return (
    <div className="fixed inset-x-0 bottom-[56px] z-30 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:left-1/2 md:w-full md:max-w-3xl md:-translate-x-1/2 md:px-4">
      <div className="rounded-[30px] border border-white/80 bg-white/96 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.18)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 rounded-[22px] bg-slate-100 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Entry Price</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatAuctionMoney(entryPrice)}</p>
            <p className="mt-1 text-[11px] text-slate-500">Wallet {formatAuctionMoney(walletBalance)}</p>
          </div>
          {isLive ? (
            <button onClick={() => onBid(1)} disabled={bidMutation.isPending || walletBalance < entryPrice} className="inline-flex min-h-[56px] min-w-[136px] items-center justify-center rounded-[22px] bg-slate-900 px-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.22)] disabled:cursor-not-allowed disabled:bg-slate-300">
              {bidMutation.isPending ? 'Processing...' : 'Bid Now'}
            </button>
          ) : (
            <div className="min-h-[56px] min-w-[136px] rounded-[22px] bg-slate-900 px-4 py-3 text-center text-xs font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]">
              {isEnded ? (winners.length ? 'Result Ready' : 'Auction Ended') : 'Coming Soon'}
            </div>
          )}
        </div>
        {isLive ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {quickCounts.map((count) => {
              const total = entryPrice * count;
              const disabled = bidMutation.isPending || walletBalance < total;
              return (
                <button key={count} onClick={() => onBid(count)} disabled={disabled} className={`rounded-[18px] px-3 py-3 text-sm font-semibold ${disabled ? 'bg-slate-100 text-slate-400' : 'bg-[linear-gradient(135deg,#0f172a,#1e293b)] text-white shadow-[0_14px_26px_rgba(15,23,42,0.14)]'}`}>
                  x{count}
                  <span className="mt-1 block text-[10px] opacity-70">{formatAuctionMoney(total)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
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

  const walletQuery = useQuery({
    queryKey: queryKeys.wallet,
    queryFn: getWallet
  });

  const bidMutation = useMutation({
    mutationFn: (entryCount) => placeAuctionBid(auctionId, entryCount),
    onSuccess: async (result) => {
      toast.success(result.message || 'Entries purchased');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.auctions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auctionDetail(auctionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auctionHistory() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Entry purchase failed')
  });

  const revealMutation = useMutation({
    mutationFn: () => revealAuctionResult(auctionId),
    onSuccess: async (result) => {
      toast.success(result.message || 'Winner revealed');
      await queryClient.invalidateQueries({ queryKey: queryKeys.auctionDetail(auctionId) });
    },
    onError: (error) => toast.error(error.message || 'Could not reveal the result')
  });

  if (detailQuery.isLoading) return <div className="rounded-[30px] border border-white/80 bg-white p-6 text-sm text-slate-500 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">Loading auction...</div>;
  if (detailQuery.isError) return <ErrorState message="Auction details could not be loaded." onRetry={detailQuery.refetch} />;

  const auction = detailQuery.data?.data;
  const status = auction?.computed_status || auction?.status;
  const entryPrice = Number(auction?.entry_price || auction?.display_current_bid || auction?.starting_price || 0.5);
  const images = getAuctionImages(auction);
  const winners = Array.isArray(auction?.winners) ? auction.winners : [];
  const leaderboard = Array.isArray(auction?.leaderboard) ? auction.leaderboard : [];
  const rewardDistribution = auction?.rewardDistribution || null;
  const walletBalance = Number(walletQuery.data?.wallet?.balance || 0);
  const participantCount = Number(auction?.participantCount || leaderboard.length || 0);

  const itemFacts = useMemo(() => ([
    auction?.short_description ? { label: 'Short Description', value: auction.short_description } : null,
    auction?.category ? { label: 'Category', value: auction.category } : null,
    auction?.item_condition ? { label: 'Condition', value: auction.item_condition } : null
  ].filter(Boolean)), [auction?.short_description, auction?.category, auction?.item_condition]);

  const handleBid = (count) => {
    const total = entryPrice * count;
    if (!walletQuery.isLoading && walletBalance < total) {
      toast.error('Insufficient wallet balance');
      return;
    }
    bidMutation.mutate(count);
  };

  const handleShare = async () => {
    const shareData = {
      title: auction?.title || 'Hope Auction',
      text: `Join the live auction for ${auction?.title || 'this item'}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Auction link copied');
    } catch {
      toast.error('Could not share this auction right now');
    }
  };

  return (
    <>
      <div className="-mx-4 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.18),_transparent_28%),linear-gradient(180deg,#f8fafc,#eef2ff_50%,#f8fafc)] px-3 pb-[220px] pt-0 sm:mx-0 sm:rounded-[30px] sm:border sm:border-slate-200/80 sm:px-4 sm:py-4 sm:pb-[220px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/auctions" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
              <ArrowLeft size={14} />
              Back
            </Link>
            <button onClick={handleShare} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
              <Share2 size={14} />
              Share
            </button>
          </div>

          <div className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a,#1e293b)] px-4 py-3 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">Auction Live Room</p>
                <h1 className="mt-1 text-[22px] font-semibold leading-tight">{auction?.title || 'Untitled auction'}</h1>
              </div>
              <AuctionStatusBadge status={status} won={Boolean(auction?.isWinner || auction?.is_winner)} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/72">
              <span className="rounded-full bg-white/10 px-3 py-1.5">{participantCount} engaged participants</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">{number(auction?.total_bids || 0)} purchase events</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">BTCT safety reward on loss</span>
            </div>
          </div>

          <Gallery images={images} title={auction?.title} status={status} participants={participantCount} latestBidder={auction?.latestBidder} />

          <section className="rounded-[30px] border border-white/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Prize Item</p>
                <h2 className="mt-2 text-[24px] font-semibold leading-8 text-slate-900">{auction?.title || 'Untitled auction'}</h2>
                <p className="mt-2 text-sm text-slate-500">Premium fixed-entry auction with live ranking and instant wallet settlement.</p>
              </div>
              <div className="shrink-0 rounded-[22px] bg-slate-900 px-3 py-2 text-right text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/65">Entry</p>
                <p className="mt-1 text-lg font-semibold">{formatAuctionMoney(entryPrice)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <StatTile icon={Clock3} label="Live Timer" value={<AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} />} tone="dark" />
              <StatTile icon={Users} label="Watching" value={`${participantCount} users`} tone="sky" />
              <StatTile icon={Medal} label="Your Position" value={auction?.myPosition ? `#${auction.myPosition}` : 'Not ranked'} />
              <StatTile icon={Wallet} label="Your Spend" value={formatAuctionMoney(auction?.myTotalSpend || 0)} />
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <FactCard title="Live Signals">
              <div className="space-y-2">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Top participant: <span className="font-semibold text-slate-900">{auction?.topParticipant?.username || 'Waiting'}</span>
                  {auction?.topParticipant ? <span className="ml-2 text-slate-500">with {auction.topParticipant.total_entries} entries</span> : null}
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Latest activity: <span className="font-semibold text-slate-900">{auction?.latestBidder?.username || 'No entries yet'}</span>
                  {auction?.latestBidder ? <span className="ml-2 text-slate-500">purchased {auction.latestBidder.entry_count} entries</span> : null}
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Entry wallet check runs before each bid. Backend remains the final authority.
                </div>
              </div>
            </FactCard>

            <FactCard title="How It Works">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-start gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3"><Gavel size={16} className="mt-0.5 text-slate-500" /><span>Each tap buys fixed-price entries at {formatAuctionMoney(entryPrice)}.</span></div>
                <div className="flex items-start gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3"><Trophy size={16} className="mt-0.5 text-slate-500" /><span>Highest total entries wins the item. Ties can produce multiple winners.</span></div>
                <div className="flex items-start gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3"><Rocket size={16} className="mt-0.5 text-slate-500" /><span>Non-winners receive BTCT compensation using {formatAuctionMoney(auction?.btctPrice || 0.1)} per BTCT.</span></div>
              </div>
            </FactCard>
          </div>

          {itemFacts.length ? (
            <FactCard title="About This Item">
              <div className="grid gap-2">
                {itemFacts.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </FactCard>
          ) : null}

          <LeaderboardCard leaderboard={leaderboard} myPosition={auction?.myPosition || 0} myEntryCount={auction?.myEntryCount || 0} />

          {status === 'ended' ? (
            <>
              <ResultRevealSection auction={auction} winners={winners} revealMutation={revealMutation} onReveal={() => revealMutation.mutateAsync()} />
              <FactCard title="Auction Result">
                <div className="space-y-3">
                  {rewardDistribution ? (
                    rewardDistribution.result_type === 'winner' ? (
                      <div className="rounded-[24px] border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-800">
                        You won this auction item. No BTCT compensation is issued on a winning result.
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                        <p className="font-semibold">BTCT compensation awarded</p>
                        <p className="mt-1">You spent {formatAuctionMoney(rewardDistribution.amount_spent)} and received {number(rewardDistribution.btct_awarded)} BTCT.</p>
                      </div>
                    )
                  ) : (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">Final outcome will appear here once settlement records are available.</div>
                  )}
                </div>
              </FactCard>
            </>
          ) : null}

          <section className="grid grid-cols-3 gap-2 rounded-[30px] border border-white/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="rounded-[22px] bg-slate-50 px-3 py-3 text-center text-sm text-slate-700"><ShieldCheck size={16} className="mx-auto text-slate-500" /><p className="mt-2 font-semibold">Secure</p></div>
            <div className="rounded-[22px] bg-slate-50 px-3 py-3 text-center text-sm text-slate-700"><Sparkles size={16} className="mx-auto text-slate-500" /><p className="mt-2 font-semibold">Instant</p></div>
            <div className="rounded-[22px] bg-slate-50 px-3 py-3 text-center text-sm text-slate-700"><Trophy size={16} className="mx-auto text-slate-500" /><p className="mt-2 font-semibold">Premium</p></div>
          </section>
        </div>
      </div>

      <StickyBidBar status={status} entryPrice={entryPrice} walletBalance={walletBalance} bidMutation={bidMutation} onBid={handleBid} winners={winners} />
    </>
  );
}
