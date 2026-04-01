'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, Gavel, Medal, Share2, Trophy, Users, Wallet } from 'lucide-react';
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
  const safeImages = images.length ? images : ['https://placehold.co/1200x1200/0f172a/ffffff?text=Auction'];
  const active = safeImages[activeIndex] || safeImages[0];
  const canMove = safeImages.length > 1;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1220] shadow-[0_18px_36px_rgba(2,6,23,0.38)]">
      <div className="relative bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_30%),linear-gradient(180deg,#111827,#0B1220)] px-3 pb-3 pt-3">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-3 py-3">
          <AuctionStatusBadge status={status} />
          <div className="rounded-full border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-[10px] font-semibold text-slate-200">
            {participants} watching
          </div>
        </div>

        <img src={active} alt={title || 'Auction'} className="mx-auto mt-6 h-[220px] w-full object-contain sm:h-[300px]" />

        {canMove ? (
          <>
            <button onClick={() => setActiveIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length)} className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-950/88 text-white" aria-label="Previous image">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setActiveIndex((prev) => (prev + 1) % safeImages.length)} className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-700 bg-slate-950/88 text-white" aria-label="Next image">
              <ChevronRight size={16} />
            </button>
          </>
        ) : null}

        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="shrink-0 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white">
            {latestBidder?.username || 'No bids yet'}
          </div>
          <div className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-300">
            {latestBidder ? `${latestBidder.entry_count} latest entries` : 'Waiting for activity'}
          </div>
        </div>
      </div>
      {canMove ? (
        <div className="flex items-center justify-center gap-1.5 px-3 pb-3">
          {safeImages.map((image, index) => (
            <button key={`${image}-${index}`} onClick={() => setActiveIndex(index)} className={`h-1.5 rounded-full transition-all ${index === activeIndex ? 'w-5 bg-indigo-500' : 'w-1.5 bg-slate-600'}`} aria-label={`Show image ${index + 1}`} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StatTile({ icon: Icon, label, value, accent = false }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${accent ? 'border-indigo-500/40 bg-indigo-500/12' : 'border-slate-800 bg-[#111827]'}`}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        <Icon size={13} />
        {label}
      </div>
      <div className={`mt-1.5 text-sm font-semibold ${accent ? 'text-white' : 'text-slate-100'}`}>{value}</div>
    </div>
  );
}

function LeaderboardCard({ leaderboard = [], myPosition, myEntryCount }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-[#111827] p-3 shadow-[0_16px_30px_rgba(2,6,23,0.28)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Leaderboard</p>
          <h2 className="mt-1 text-sm font-semibold text-white">Top participants</h2>
        </div>
        <div className="rounded-xl bg-slate-950 px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Your rank</p>
          <p className="mt-1 text-sm font-semibold text-white">{myPosition ? `#${myPosition}` : 'Unranked'}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {leaderboard.length ? leaderboard.map((entry) => (
          <div key={entry.user_id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${entry.is_current_user ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-slate-800 bg-slate-950/60'}`}>
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">#{entry.rank}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{entry.username}</p>
              <p className="text-[11px] text-slate-400">{entry.total_bids} purchase events</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{entry.total_entries}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">entries</p>
            </div>
          </div>
        )) : <p className="rounded-xl border border-dashed border-slate-700 px-3 py-3 text-sm text-slate-400">Leaderboard will populate after the first entries arrive.</p>}
      </div>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-300">
        Your total entries: <span className="font-semibold text-white">{myEntryCount}</span>
      </div>
    </section>
  );
}

function FactCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-[#111827] p-3 shadow-[0_16px_30px_rgba(2,6,23,0.28)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CapacityProgressCard({ totalCapacity, capacityPercent }) {
  if (!totalCapacity) return null;

  return (
    <div className="mt-3 rounded-xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.10),rgba(15,23,42,0.08))] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Capacity Filled</p>
      <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-white/90 ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(15,23,42,0.08)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-500 to-emerald-400 shadow-[0_0_18px_rgba(34,211,238,0.35)] transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, capacityPercent))}%` }}
        />
      </div>
    </div>
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
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-700 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.26),_transparent_30%),linear-gradient(135deg,#0B1220,#111827)] px-3 py-3 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Prize Distributed</p>
              <h3 className="mt-1 text-sm font-semibold">{revealed ? 'Winner Revealed' : 'Spin to Reveal Winner'}</h3>
              <p className="mt-1 text-xs text-slate-300">Reveal uses the finalized result only.</p>
            </div>
            <button
              onClick={handleReveal}
              disabled={!eligible || spinning || revealMutation.isPending || revealed}
              className={`relative inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white/10 bg-[conic-gradient(from_90deg,_#22c55e,_#6366f1,_#22c55e)] ${spinning ? 'animate-[spin_1.8s_linear]' : ''} disabled:opacity-70`}
              aria-label="Spin to reveal winner"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-[11px] font-semibold text-white">{revealed ? 'Done' : 'Spin'}</span>
            </button>
          </div>
        </div>

        <div className={`rounded-xl border px-3 py-3 text-sm ${auction?.isWinner ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100' : 'border-slate-800 bg-slate-950/60 text-slate-200'}`}>
          <p className="font-semibold">{revealed ? (auction?.isWinner ? 'You Won' : winners.length > 1 ? 'Winners Revealed' : 'Winner Revealed') : 'Tap to reveal result'}</p>
          <p className="mt-1 text-xs text-slate-300">
            {revealed
              ? (winners.length > 1 ? `Winners: ${winners.map((winner) => winner.username).join(', ')}` : `Winner: ${winners[0]?.username || 'Unavailable'}`)
              : `Reveal the finalized winner${winners.length > 1 ? 's' : ''} for this auction.`}
          </p>
        </div>
      </div>
    </FactCard>
  );
}

function StickyBidBar({ status, entryPrice, walletBalance, walletReady, bidMutation, onBid, winners }) {
  const quickCounts = [1, 5, 10];
  const isLive = status === 'live';
  const isEnded = status === 'ended';
  const primaryBidBlocked = walletReady && walletBalance < entryPrice;
  const bidHelperText = !walletReady
    ? 'Checking wallet balance...'
    : primaryBidBlocked
      ? 'Add funds to place a bid'
      : 'Tap to place 1 entry instantly';

  return (
    <div className="fixed inset-x-0 bottom-[56px] z-30 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] md:left-1/2 md:w-full md:max-w-3xl md:-translate-x-1/2 md:px-4">
      <div className="rounded-2xl border border-slate-800 bg-[#0B1220]/98 p-3 shadow-[0_20px_40px_rgba(2,6,23,0.55)] backdrop-blur-sm">
        <div className="flex items-stretch gap-3">
          <div className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-[#111827] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Entry Price</p>
            <p className="mt-1 text-lg font-bold text-emerald-400">{formatAuctionMoney(entryPrice)}</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-300">Wallet {formatAuctionMoney(walletBalance)}</p>
            <p className={`mt-1 text-[11px] font-medium ${primaryBidBlocked ? 'text-amber-300' : 'text-slate-400'}`}>{bidHelperText}</p>
          </div>
          {isLive ? (
            <button
              onClick={() => onBid(1)}
              disabled={bidMutation.isPending}
              aria-disabled={bidMutation.isPending || primaryBidBlocked}
              className={`inline-flex min-h-[56px] min-w-[138px] items-center justify-center rounded-xl px-5 text-sm font-bold transition-colors ${primaryBidBlocked ? 'border border-amber-500/50 bg-amber-500/12 text-amber-100' : 'bg-emerald-500 text-white'} disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400`}
            >
              {bidMutation.isPending ? 'Processing...' : primaryBidBlocked ? 'Insufficient Balance' : 'Bid Now'}
            </button>
          ) : (
            <div className="inline-flex min-h-[56px] min-w-[138px] items-center justify-center rounded-xl bg-indigo-500 px-4 text-sm font-bold text-white">
              {isEnded ? (winners.length ? 'Result Ready' : 'Auction Ended') : 'Coming Soon'}
            </div>
          )}
        </div>
        {isLive ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {quickCounts.map((count) => {
              const total = entryPrice * count;
              const balanceBlocked = walletReady && walletBalance < total;
              return (
                <button
                  key={count}
                  onClick={() => onBid(count)}
                  disabled={bidMutation.isPending}
                  aria-disabled={bidMutation.isPending || balanceBlocked}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${balanceBlocked ? 'border-amber-500/35 bg-amber-500/10 text-amber-100' : 'border-slate-700 bg-[#111827] text-white'} disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-800 disabled:text-slate-500`}
                >
                  x{count}
                  <span className={`mt-0.5 block text-[10px] ${balanceBlocked ? 'text-amber-200' : 'text-slate-400'}`}>{formatAuctionMoney(total)}</span>
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

  const auction = detailQuery.data?.data || null;
  const status = auction?.computed_status || auction?.status || 'upcoming';
  const entryPrice = Number(auction?.entry_price || auction?.display_current_bid || auction?.starting_price || 0.5);
  const images = getAuctionImages(auction);
  const winners = Array.isArray(auction?.winners) ? auction.winners : [];
  const leaderboard = Array.isArray(auction?.leaderboard) ? auction.leaderboard : [];
  const rewardDistribution = auction?.rewardDistribution || null;
  const walletBalance = Number(walletQuery.data?.wallet?.balance || 0);
  const walletReady = !walletQuery.isLoading && !walletQuery.isError;
  const participantCount = Number(auction?.participantCount || leaderboard.length || 0);

  const itemFacts = useMemo(() => ([
    auction?.category ? { label: 'Category', value: auction.category } : null,
    auction?.item_condition ? { label: 'Condition', value: auction.item_condition } : null,
    auction?.short_description ? { label: 'Summary', value: auction.short_description } : null
  ].filter(Boolean).slice(0, 2)), [auction?.category, auction?.item_condition, auction?.short_description]);

  if (detailQuery.isLoading) return <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 text-sm text-slate-300">Loading auction...</div>;
  if (detailQuery.isError || !auction) return <ErrorState message="Auction details could not be loaded." onRetry={detailQuery.refetch} />;

  const handleBid = (count) => {
    if (status !== 'live') {
      toast.error(status === 'upcoming' ? 'Auction has not started yet' : status === 'ended' ? 'Auction has ended' : 'Auction is not available for entries');
      return;
    }
    if (!walletReady) {
      toast.error('Wallet balance is still loading');
      return;
    }
    const total = entryPrice * count;
    if (walletBalance < total) {
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
      <div className="-mx-4 bg-[#0B1220] px-3 pb-[188px] pt-0 sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-800 sm:px-4 sm:py-3 sm:pb-[188px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/auctions" className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#111827] px-3 py-2 text-xs font-semibold text-white">
              <ArrowLeft size={14} />
              Back
            </Link>
            <button onClick={handleShare} className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#111827] px-3 py-2 text-xs font-semibold text-white">
              <Share2 size={14} />
              Share
            </button>
          </div>

          <Gallery images={images} title={auction?.title} status={status} participants={participantCount} latestBidder={auction?.latestBidder} />

          <section className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-[0_16px_30px_rgba(2,6,23,0.28)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Auction Detail</p>
                <h1 className="mt-1 text-lg font-semibold leading-6 text-white">{auction?.title || 'Untitled auction'}</h1>
              </div>
              <AuctionStatusBadge status={status} won={Boolean(auction?.isWinner || auction?.is_winner)} />
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Entry Price</p>
                <p className="mt-1 text-lg font-bold text-emerald-400">{formatAuctionMoney(entryPrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Watching</p>
                <p className="mt-1 text-sm font-semibold text-white">{participantCount} users</p>
              </div>
            </div>

            <CapacityProgressCard
              totalCapacity={auction?.totalCapacity}
              capacityFilled={auction?.capacityFilled}
              capacityRemaining={auction?.capacityRemaining}
              capacityPercent={auction?.capacityPercent}
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <StatTile icon={Clock3} label="Timer" value={<AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} compact />} accent />
              <StatTile icon={Users} label="Activity" value={auction?.latestBidder?.username || 'No bids yet'} />
              <StatTile icon={Medal} label="Your Position" value={auction?.myPosition ? `#${auction.myPosition}` : 'Not ranked'} />
              <StatTile icon={Wallet} label="Your Spend" value={formatAuctionMoney(auction?.myTotalSpend || 0)} />
            </div>
          </section>

          {itemFacts.length ? (
            <FactCard title="Item Details">
              <div className="grid gap-2">
                {itemFacts.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm font-medium text-white">{item.value}</p>
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
                <div className="space-y-2">
                  {rewardDistribution ? (
                    rewardDistribution.result_type === 'winner' ? (
                      <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-3 text-sm text-white">
                        You won this auction item. No BTCT compensation is issued on a winning result.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-sm text-white">
                        <p className="font-semibold">BTCT compensation awarded</p>
                        <p className="mt-1 text-xs text-slate-200">You spent {formatAuctionMoney(rewardDistribution.amount_spent)} and received {number(rewardDistribution.btct_awarded)} BTCT.</p>
                      </div>
                    )
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm text-slate-300">Final outcome will appear here once settlement records are available.</div>
                  )}
                </div>
              </FactCard>
            </>
          ) : null}

          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-[#111827] p-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-2.5 text-center text-xs font-semibold text-white">Secure</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-2.5 text-center text-xs font-semibold text-white">Instant</div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-2.5 text-center text-xs font-semibold text-white">Premium</div>
          </div>
        </div>
      </div>

      <StickyBidBar status={status} entryPrice={entryPrice} walletBalance={walletBalance} walletReady={walletReady} bidMutation={bidMutation} onBid={handleBid} winners={winners} />
    </>
  );
}
