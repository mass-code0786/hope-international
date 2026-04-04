'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock3,
  Gift,
  Medal,
  Share2,
  Sparkles,
  Users,
  Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SpinWheelResult } from '@/components/auctions/SpinWheelResult';
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

function CompactMetric({ label, value, icon: Icon, accent = false }) {
  return (
    <div className={`rounded-[18px] border px-3 py-2.5 ${accent ? 'border-amber-100 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#666666]">
        <Icon size={12} className={accent ? 'text-amber-600' : 'text-slate-500'} />
        {label}
      </div>
      <div className="mt-1.5 text-[13px] font-semibold text-[#111111]">{value}</div>
    </div>
  );
}

function HeroCard({ auction, status, entryPrice, participantCount, latestBidder, topParticipant }) {
  const images = getAuctionImages(auction);
  const cover = images[0] || 'https://placehold.co/900x900/e2e8f0/334155?text=Auction';
  const prizeLabel = auction?.reward_mode === 'split'
    ? `${formatAuctionMoney(auction?.reward_value || 0)} reward`
    : `${number(auction?.stock_quantity || 1)} prize`;
  const liveCenterTitle = status === 'live'
    ? (latestBidder?.username || topParticipant?.username || 'Live now')
    : status === 'ended'
      ? 'Result ready'
      : 'Starting soon';
  const liveCenterSub = status === 'live'
    ? (latestBidder ? `${latestBidder.entry_count} latest entries` : 'Waiting for first bid')
    : status === 'ended'
      ? 'Auction closed'
      : 'Get ready to join';

  return (
    <section className="rounded-[24px] border border-[#ececec] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <div className="rounded-[20px] border border-[#f1f1f1] bg-[linear-gradient(180deg,#ffffff,#f8f9fb)] p-3">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[10px] font-semibold text-[#666666]">
            <Users size={12} />
            {participantCount} watching
          </span>
          <div className="shrink-0">
            <AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} compact />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_88px] items-center gap-2.5">
          <div className="min-w-0 rounded-[18px] border border-[#efefef] bg-white p-2.5">
            <div className="mx-auto flex h-[142px] w-full max-w-[142px] items-center justify-center rounded-[22px] bg-[linear-gradient(180deg,#ffffff,#f7f9fc)] p-3">
              <img src={cover} alt={auction?.title || 'Auction'} className="h-full w-full object-contain" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="rounded-[16px] border border-[#ececec] bg-white px-2.5 py-2 text-center shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#888888]">Entry Fee</p>
              <p className="mt-1 text-[13px] font-bold text-[#111111]">{formatAuctionMoney(entryPrice)}</p>
            </div>
            <div className="rounded-[16px] border border-[#ececec] bg-white px-2.5 py-2 text-center shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#888888]">Prize</p>
              <p className="mt-1 text-[12px] font-bold text-[#111111]">{prizeLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="mx-auto flex max-w-[176px] flex-col items-center rounded-full border border-[#ececec] bg-white px-3 py-2.5 text-center shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
            <AuctionStatusBadge status={status} won={Boolean(auction?.isWinner || auction?.is_winner)} />
            <p className="mt-1.5 text-[12px] font-semibold text-[#111111]">{liveCenterTitle}</p>
            <p className="mt-0.5 text-[10px] text-[#666666]">{liveCenterSub}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LeaderboardPanel({ leaderboard = [], myPosition }) {
  return (
    <section className="rounded-[22px] border border-[#ececec] bg-white p-3 shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#888888]">Live Leaderboard</p>
          <h2 className="mt-0.5 text-[13px] font-semibold text-[#111111]">Top participants</h2>
        </div>
        <div className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">
          {myPosition ? `Rank #${myPosition}` : 'Unranked'}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {leaderboard.length ? leaderboard.slice(0, 5).map((entry) => (
          <div key={entry.user_id || entry.username} className={`flex items-center justify-between gap-2 rounded-[14px] border px-2.5 py-2 ${entry.is_current_user ? 'border-amber-200 bg-amber-50' : 'border-[#ececec] bg-white'}`}>
            <div className="flex min-w-0 items-center gap-2">
              <div className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f8fafc] text-[11px] font-bold text-[#111111] shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
                {entry.rank}
              </div>
              <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef2f7] text-[10px] font-semibold text-[#555555]">
                {(entry.username || 'P').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-[#111111]">{entry.username || 'Participant'}</p>
                <p className="text-[10px] text-[#666666]">{entry.total_bids || 0} bids</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[12px] font-semibold text-[#111111]">{entry.total_entries || 0}</p>
              <p className="text-[10px] text-[#888888]">entries</p>
            </div>
          </div>
        )) : (
          <div className="rounded-[14px] border border-dashed border-[#ececec] bg-[#fafafa] px-3 py-3 text-[12px] text-[#666666]">
            Leaderboard will appear after the first entries come in.
          </div>
        )}
      </div>
    </section>
  );
}

function ResultRevealSection({ auction, winners, onReveal, revealMutation }) {
  const alreadyRevealed = Boolean(auction?.resultReveal?.revealed_at);
  const eligible = Boolean(auction?.revealEligible);

  if (!eligible && !alreadyRevealed) return null;

  return (
    <SpinWheelResult
      winners={winners}
      alreadyRevealed={alreadyRevealed}
      eligible={eligible}
      revealPending={revealMutation.isPending}
      onReveal={onReveal}
    />
  );
}

function StickyBidBar({ status, entryPrice, walletBalance, walletReady, bidMutation, onBid, participantCount, winners }) {
  const isLive = status === 'live';
  const isEnded = status === 'ended';
  const primaryBidBlocked = walletReady && walletBalance < entryPrice;
  const primaryLabel = isLive ? (primaryBidBlocked ? 'Insufficient Balance' : 'Bid Now') : isEnded ? (winners.length ? 'View Result' : 'Auction Ended') : 'Coming Soon';

  return (
    <div className="fixed inset-x-0 bottom-[56px] z-30 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] md:left-1/2 md:w-full md:max-w-3xl md:-translate-x-1/2 md:px-4">
      <div className="rounded-[22px] border border-[#ececec] bg-white p-2.5 shadow-[0_14px_28px_rgba(15,23,42,0.12)]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <button
            type="button"
            onClick={() => onBid(1)}
            disabled={!isLive || bidMutation.isPending || primaryBidBlocked}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#111827,#1f2937)] px-4 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {bidMutation.isPending ? 'Processing...' : primaryLabel}
          </button>
          <button
            type="button"
            onClick={() => onBid(5)}
            disabled={!isLive || bidMutation.isPending || (walletReady && walletBalance < entryPrice * 5)}
            className="inline-flex h-11 min-w-[62px] items-center justify-center rounded-full border border-[#ececec] bg-[#f8fafc] px-3 text-[12px] font-semibold text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
          >
            x5
          </button>
          <div className="inline-flex h-11 min-w-[78px] items-center justify-center rounded-full border border-[#ececec] bg-[#f8fafc] px-3 text-center">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#888888]">Entry</p>
              <p className="text-[11px] font-bold text-[#111111]">{formatAuctionMoney(entryPrice)}</p>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-full bg-[#f8fafc] px-3 py-1.5 text-[10px] text-[#666666]">
          <span>{participantCount} participants</span>
          <span>Wallet {formatAuctionMoney(walletBalance)}</span>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-center text-[9px] font-semibold text-[#666666]">Secure</div>
          <div className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-center text-[9px] font-semibold text-[#666666]">Instant</div>
          <div className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-center text-[9px] font-semibold text-[#666666]">Lowest Price</div>
        </div>
      </div>
    </div>
  );
}

export default function AuctionDetailPage() {
  const params = useParams();
  const router = useRouter();
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
  const winners = Array.isArray(auction?.winners) ? auction.winners : [];
  const leaderboard = Array.isArray(auction?.leaderboard) ? auction.leaderboard : [];
  const rewardDistribution = auction?.rewardDistribution || null;
  const walletBalance = Number(walletQuery.data?.wallet?.balance || 0);
  const walletReady = !walletQuery.isLoading && !walletQuery.isError;
  const participantCount = Number(auction?.participantCount || leaderboard.length || 0);
  const communityCount = Number(auction?.total_entries || auction?.total_bids || participantCount || 0);
  const latestBidder = auction?.latestBidder || auction?.topParticipant || null;
  const topParticipant = auction?.topParticipant || leaderboard[0] || null;
  const aboutTitle = auction?.product_name || auction?.title || 'Auction item';
  const aboutSource = auction?.seller_name || auction?.store_name || auction?.category || 'Hope Marketplace';
  const aboutDescription = auction?.short_description || auction?.description || 'Join this auction for a chance to win with compact entry pricing and live leaderboard updates.';

  if (detailQuery.isLoading) {
    return <div className="rounded-[22px] border border-[#ececec] bg-white p-4 text-sm text-[#666666]">Loading auction...</div>;
  }

  if (detailQuery.isError || !auction) {
    return <ErrorState message="Auction details could not be loaded." onRetry={detailQuery.refetch} />;
  }

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
      <div className="-mx-4 min-h-screen bg-[linear-gradient(to_bottom,#ffffff,#f8f9fb)] px-4 pb-[188px] pt-2 sm:mx-0 sm:rounded-[28px] sm:border sm:border-[#ececec] sm:px-4 sm:py-3 sm:pb-[188px]">
        <div className="mx-auto max-w-xl space-y-3">
          <section className="rounded-[22px] border border-[#ececec] bg-white p-3 shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ececec] bg-[#f8fafc] text-[#333333]"
                aria-label="Go back"
              >
                <ArrowLeft size={16} />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-[14px] font-semibold text-[#111111]">{auction?.title || 'Auction'}</p>
                <div className="mt-0.5 flex items-center justify-center gap-2">
                  <AuctionStatusBadge status={status} won={Boolean(auction?.isWinner || auction?.is_winner)} />
                </div>
              </div>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#ececec] bg-[#f8fafc] text-[#333333]"
                aria-label="Share auction"
              >
                <Share2 size={16} />
              </button>
            </div>
          </section>

          <section className="rounded-[18px] border border-[#f2dfb4] bg-[#fff8e8] px-3 py-2.5 shadow-[0_6px_16px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-2 text-[11px] text-[#333333]">
              <Gift size={13} />
              <span className="font-semibold">Refer & Earn</span>
              <span className="truncate text-[#666666]">Share this auction with your network and grow your activity.</span>
            </div>
          </section>

          <HeroCard
            auction={auction}
            status={status}
            entryPrice={entryPrice}
            participantCount={participantCount}
            latestBidder={latestBidder}
            topParticipant={topParticipant}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <section className="rounded-[22px] border border-[#ececec] bg-white p-3 shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#888888]">Summary</p>
              <div className="mt-3 space-y-2">
                <CompactMetric label="Your Position" value={auction?.myPosition ? `#${auction.myPosition}` : 'Not ranked'} icon={Medal} accent />
                <CompactMetric label="Community" value={`${communityCount} entries`} icon={Users} />
                <CompactMetric label="Your Spend" value={formatAuctionMoney(auction?.myTotalSpend || 0)} icon={Wallet} />
              </div>
            </section>

            <LeaderboardPanel leaderboard={leaderboard} myPosition={auction?.myPosition || 0} />
          </div>

          <section className="rounded-[22px] border border-[#ececec] bg-white p-3 shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#888888]">About this auction</p>
            <div className="mt-2.5 space-y-1.5">
              <p className="text-[11px] font-semibold text-[#666666]">{aboutSource}</p>
              <h2 className="text-[15px] font-semibold leading-5 text-[#111111]">{aboutTitle}</h2>
              <p className="line-clamp-4 text-[12px] leading-5 text-[#333333]">{aboutDescription}</p>
            </div>
          </section>

          <section className="rounded-[18px] bg-[linear-gradient(135deg,#111827,#1f2937)] px-3 py-2.5 text-white shadow-[0_12px_24px_rgba(15,23,42,0.10)]">
            <div className="flex items-center gap-2 text-[11px]">
              <Sparkles size={13} />
              <span className="font-semibold">Win & Earn</span>
              <span className="truncate text-white/80">
                {rewardDistribution
                  ? rewardDistribution.result_type === 'winner'
                    ? 'Winning result confirmed for this auction.'
                    : `BTCT reward ${number(rewardDistribution.btct_awarded)} available on settled loss.`
                  : latestBidder
                    ? `${latestBidder.username} is the latest bidder right now.`
                    : 'Join early for the best chance to lead the board.'}
              </span>
            </div>
          </section>

          {status === 'ended' ? (
            <>
              <ResultRevealSection auction={auction} winners={winners} revealMutation={revealMutation} onReveal={() => revealMutation.mutateAsync()} />

              <section className="rounded-[22px] border border-[#ececec] bg-white p-3 shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#888888]">Auction Result</p>
                <div className="mt-2.5">
                  {rewardDistribution ? (
                    rewardDistribution.result_type === 'winner' ? (
                      <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-3 py-3 text-[12px] text-[#333333]">
                        You won this auction item. No BTCT compensation is issued on a winning result.
                      </div>
                    ) : (
                      <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-3 text-[12px] text-[#333333]">
                        <p className="font-semibold text-[#111111]">BTCT compensation awarded</p>
                        <p className="mt-1 text-[11px] text-[#666666]">You spent {formatAuctionMoney(rewardDistribution.amount_spent)} and received {number(rewardDistribution.btct_awarded)} BTCT.</p>
                      </div>
                    )
                  ) : (
                    <div className="rounded-[18px] border border-[#ececec] bg-[#fafafa] px-3 py-3 text-[12px] text-[#666666]">
                      Final outcome will appear here once settlement records are available.
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>

      <StickyBidBar
        status={status}
        entryPrice={entryPrice}
        walletBalance={walletBalance}
        walletReady={walletReady}
        bidMutation={bidMutation}
        onBid={handleBid}
        participantCount={participantCount}
        winners={winners}
      />
    </>
  );
}
