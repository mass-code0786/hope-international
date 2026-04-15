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
    <div className={`rounded-[18px] border px-3 py-2.5 ${accent ? 'border-emerald-500/20 bg-[rgba(34,197,94,0.12)]' : 'border-[rgba(255,255,255,0.08)] bg-[#1A1D2E]'}`}>
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7A7F9A]">
        <Icon size={12} className={accent ? 'text-[#22c55e]' : 'text-[#B0B3C6]'} />
        {label}
      </div>
      <div className="mt-1.5 text-[13px] font-semibold text-[#FFFFFF]">{value}</div>
    </div>
  );
}

function HeroCard({ auction, status, entryPrice, participantCount, latestBidder, topParticipant }) {
  const images = getAuctionImages(auction);
  const cover = images[0] || 'https://placehold.co/900x900/e2e8f0/334155?text=Auction';
  const isCashAuction = auction?.reward_mode === 'cash' || auction?.auction_type === 'cash_amount';
  const prizeLabel = isCashAuction
    ? `${formatAuctionMoney(auction?.cash_prize || auction?.each_winner_amount || auction?.prize_amount || 0)} cash`
    : auction?.reward_mode === 'split'
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
    <section className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] p-3 shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
      <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,#1A1D2E,#111827)] p-3">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#14182D] px-2.5 py-1 text-[10px] font-semibold text-[#B0B3C6]">
            <Users size={12} />
            {participantCount} watching
          </span>
          <div className="shrink-0">
            <AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} compact />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_88px] items-center gap-2.5">
          <div className="min-w-0 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#111827] p-2.5">
            <div className="mx-auto flex h-[142px] w-full max-w-[142px] items-center justify-center rounded-[22px] bg-[#1F2937] p-3">
              <img src={cover} alt={auction?.title || 'Auction'} className="h-full w-full object-contain" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] px-2.5 py-2 text-center shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7A7F9A]">Entry Fee</p>
              <p className="mt-1 text-[13px] font-bold text-[#FFFFFF]">{formatAuctionMoney(entryPrice)}</p>
            </div>
            <div className="rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] px-2.5 py-2 text-center shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7A7F9A]">Prize</p>
              <p className="mt-1 text-[12px] font-bold text-[#FFFFFF]">{prizeLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="mx-auto flex max-w-[176px] flex-col items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[#14182D] px-3 py-2.5 text-center shadow-[0_8px_18px_rgba(15,23,42,0.24)]">
            <AuctionStatusBadge status={status} won={Boolean(auction?.isWinner || auction?.is_winner)} />
            <p className="mt-1.5 text-[12px] font-semibold text-[#FFFFFF]">{liveCenterTitle}</p>
            <p className="mt-0.5 text-[10px] text-[#B0B3C6]">{liveCenterSub}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LeaderboardPanel({ leaderboard = [], myPosition }) {
  return (
    <section className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] p-3 shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7A7F9A]">Live Leaderboard</p>
          <h2 className="mt-0.5 text-[13px] font-semibold text-[#FFFFFF]">Top participants</h2>
        </div>
        <div className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-2.5 py-1 text-[10px] font-semibold text-white">
          {myPosition ? `Rank #${myPosition}` : 'Unranked'}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {leaderboard.length ? leaderboard.slice(0, 5).map((entry) => (
          <div key={entry.user_id || entry.username} className={`flex items-center justify-between gap-2 rounded-[14px] border px-2.5 py-2 ${entry.is_current_user ? 'border-emerald-500/25 bg-[rgba(34,197,94,0.10)]' : 'border-[rgba(255,255,255,0.08)] bg-[#14182D]'}`}>
            <div className="flex min-w-0 items-center gap-2">
              <div className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F2937] text-[11px] font-bold text-[#FFFFFF] shadow-[0_2px_6px_rgba(15,23,42,0.18)]">
                {entry.rank}
              </div>
              <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#273043] text-[10px] font-semibold text-[#B0B3C6]">
                {(entry.username || 'P').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-[#FFFFFF]">{entry.username || 'Participant'}</p>
                <p className="text-[10px] text-[#B0B3C6]">{entry.total_bids || 0} bids</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[12px] font-semibold text-[#FFFFFF]">{entry.total_entries || 0}</p>
              <p className="text-[10px] text-[#7A7F9A]">entries</p>
            </div>
          </div>
        )) : (
          <div className="rounded-[14px] border border-dashed border-[rgba(255,255,255,0.08)] bg-[#14182D] px-3 py-3 text-[12px] text-[#B0B3C6]">
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

function winnerModeLabel(mode) {
  if (mode === 'middle') return 'Middle winner';
  if (mode === 'last') return 'Last winner';
  return 'Highest winner';
}

function StickyBidBar({ status, entryPrice, walletBalance, auctionBonusBalance, walletReady, bidMutation, onBid, participantCount, winners }) {
  const isLive = status === 'live';
  const isEnded = status === 'ended';
  const primaryBidBlocked = walletReady && walletBalance < entryPrice;
  const primaryLabel = isLive ? (primaryBidBlocked ? 'Insufficient Balance' : 'Bid Now') : isEnded ? (winners.length ? 'View Result' : 'Auction Ended') : 'Coming Soon';

  return (
    <div className="fixed inset-x-0 bottom-[56px] z-30 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] md:left-1/2 md:w-full md:max-w-3xl md:-translate-x-1/2 md:px-4">
      <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] p-2.5 shadow-[0_18px_45px_rgba(15,23,42,0.3)]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <button
            type="button"
            onClick={() => onBid(1)}
            disabled={!isLive || bidMutation.isPending || primaryBidBlocked}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-4 text-[12px] font-semibold text-white shadow-[0_10px_24px_rgba(124,58,237,0.35)] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {bidMutation.isPending ? 'Processing...' : primaryLabel}
          </button>
          <button
            type="button"
            onClick={() => onBid(5)}
            disabled={!isLive || bidMutation.isPending || (walletReady && walletBalance < entryPrice * 5)}
            className="inline-flex h-11 min-w-[62px] items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[#14182D] px-3 text-[12px] font-semibold text-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            x5
          </button>
          <div className="inline-flex h-11 min-w-[78px] items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[#14182D] px-3 text-center">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7A7F9A]">Entry</p>
              <p className="text-[11px] font-bold text-[#FFFFFF]">{formatAuctionMoney(entryPrice)}</p>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between rounded-full bg-[#14182D] px-3 py-1.5 text-[10px] text-[#B0B3C6]">
          <span>{participantCount} participants</span>
          <span>Spendable {formatAuctionMoney(walletBalance)}</span>
        </div>

        {auctionBonusBalance > 0 ? (
          <div className="mt-2 rounded-full bg-[rgba(34,197,94,0.12)] px-3 py-1.5 text-center text-[10px] font-semibold text-emerald-300">
            Auction bonus available {formatAuctionMoney(auctionBonusBalance)}
          </div>
        ) : null}

        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-full bg-[#14182D] px-3 py-1.5 text-center text-[9px] font-semibold text-[#7A7F9A]">Secure</div>
          <div className="rounded-full bg-[#14182D] px-3 py-1.5 text-center text-[9px] font-semibold text-[#7A7F9A]">Instant</div>
          <div className="rounded-full bg-[#14182D] px-3 py-1.5 text-center text-[9px] font-semibold text-[#7A7F9A]">Lowest Price</div>
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
  const walletBalance = Number(
    walletQuery.data?.wallet?.auction_spendable_balance
    ?? walletQuery.data?.wallet?.auction_spendable_wallet_balance
    ?? walletQuery.data?.wallet?.balance
    ?? 0
  );
  const auctionBonusBalance = Number(walletQuery.data?.wallet?.auction_bonus_balance ?? walletQuery.data?.wallet?.auction_bonus_wallet_balance ?? 0);
  const walletReady = !walletQuery.isLoading && !walletQuery.isError;
  const participantCount = Number(auction?.participantCount || leaderboard.length || 0);
  const communityCount = Number(auction?.total_entries || auction?.total_bids || participantCount || 0);
  const latestBidder = auction?.latestBidder || auction?.topParticipant || null;
  const topParticipant = auction?.topParticipant || leaderboard[0] || null;
  const aboutTitle = auction?.product_name || auction?.title || 'Auction item';
  const aboutSource = auction?.seller_name || auction?.store_name || auction?.category || 'Hope Marketplace';
  const aboutDescription = auction?.short_description || auction?.description || 'Join this auction for a chance to win with compact entry pricing and live leaderboard updates.';
  const isCashAuction = auction?.reward_mode === 'cash' || auction?.auction_type === 'cash_amount';

  if (detailQuery.isLoading) {
    return <div className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] p-4 text-sm text-[#B0B3C6]">Loading auction...</div>;
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
      <div className="-mx-4 min-h-screen bg-[#0B0F1A] px-4 pb-[188px] pt-2 sm:mx-0 sm:rounded-[28px] sm:border sm:border-[rgba(255,255,255,0.08)] sm:px-4 sm:py-3 sm:pb-[188px]">
        <div className="mx-auto max-w-xl space-y-3">
          <section className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] p-3 shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[#14182D] text-[#FFFFFF]"
                aria-label="Go back"
              >
                <ArrowLeft size={16} />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-[14px] font-semibold text-[#FFFFFF]">{auction?.title || 'Auction'}</p>
                <div className="mt-0.5 flex items-center justify-center gap-2">
                  <AuctionStatusBadge status={status} won={Boolean(auction?.isWinner || auction?.is_winner)} />
                </div>
              </div>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[#14182D] text-[#FFFFFF]"
                aria-label="Share auction"
              >
                <Share2 size={16} />
              </button>
            </div>
          </section>

          <section className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] px-3 py-2.5 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-2 text-[11px] text-[#FFFFFF]">
              <Gift size={13} />
              <span className="font-semibold">Refer & Earn</span>
              <span className="truncate text-[#B0B3C6]">Share this auction with your network and grow your activity.</span>
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
            <section className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] p-3 shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7A7F9A]">Summary</p>
              <div className="mt-3 space-y-2">
                <CompactMetric label="Your Position" value={auction?.myPosition ? `#${auction.myPosition}` : 'Not ranked'} icon={Medal} accent />
                <CompactMetric label="Community" value={`${communityCount} entries`} icon={Users} />
                <CompactMetric label="Your Spend" value={formatAuctionMoney(auction?.myTotalSpend || 0)} icon={Wallet} />
              </div>
            </section>

            <LeaderboardPanel leaderboard={leaderboard} myPosition={auction?.myPosition || 0} />
          </div>

          <section className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] p-3 shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7A7F9A]">About this auction</p>
            <div className="mt-2.5 space-y-1.5">
              <p className="text-[11px] font-semibold text-[#B0B3C6]">{aboutSource}</p>
              <h2 className="text-[15px] font-semibold leading-5 text-[#FFFFFF]">{aboutTitle}</h2>
              <p className="line-clamp-4 text-[12px] leading-5 text-[#B0B3C6]">{aboutDescription}</p>
            </div>
          </section>

          <section className="rounded-[18px] bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-3 py-2.5 text-white shadow-[0_12px_24px_rgba(124,58,237,0.22)]">
            <div className="flex items-center gap-2 text-[11px]">
              <Sparkles size={13} />
              <span className="font-semibold">Win & Earn</span>
              <span className="truncate text-white">
                {rewardDistribution
                  ? rewardDistribution.result_type === 'winner'
                    ? (rewardDistribution.cash_awarded ? `${formatAuctionMoney(rewardDistribution.cash_awarded)} credited to your withdrawal wallet.` : 'Winning result confirmed for this auction.')
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

              <section className="rounded-[22px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] p-3 shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7A7F9A]">Auction Result</p>
                <div className="mt-2.5">
                  {winners.length ? (
                    <div className="mb-3 space-y-2">
                      {winners.map((winner) => (
                        <div key={`${winner.user_id}-${winner.selection_rank || winner.winner_mode}`} className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#14182D] px-3 py-3 text-[12px] text-[#B0B3C6]">
                          <p className="font-semibold text-[#FFFFFF]">{winner.username}</p>
                          <p className="mt-1">{winnerModeLabel(winner.winner_mode)}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {rewardDistribution ? (
                    rewardDistribution.result_type === 'winner' ? (
                      <div className="rounded-[18px] border border-emerald-500/20 bg-[rgba(34,197,94,0.12)] px-3 py-3 text-[12px] text-[#FFFFFF]">
                        {rewardDistribution.cash_awarded
                          ? (
                            <>
                              <p className="font-semibold">Cash auction win confirmed</p>
                              <p className="mt-1 text-[11px] text-emerald-100">Won {formatAuctionMoney(rewardDistribution.cash_awarded)} and credited to your withdrawal wallet.</p>
                              {rewardDistribution.metadata?.selectionRank ? <p className="mt-1 text-[11px] text-emerald-100">Winning rank: #{rewardDistribution.metadata.selectionRank}</p> : null}
                              <p className="mt-1 text-[11px] text-emerald-100">Reference: {auction.id}</p>
                              <p className="mt-1 text-[11px] text-emerald-100">{rewardDistribution.distributed_at ? new Date(rewardDistribution.distributed_at).toLocaleString() : 'Settlement completed'}</p>
                            </>
                          )
                          : 'You won this auction item. No BTCT compensation is issued on a winning result.'}
                      </div>
                    ) : (
                      <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#14182D] px-3 py-3 text-[12px] text-[#B0B3C6]">
                        <p className="font-semibold text-[#FFFFFF]">BTCT compensation awarded</p>
                        <p className="mt-1 text-[11px] text-[#B0B3C6]">You spent {formatAuctionMoney(rewardDistribution.amount_spent)} and received {number(rewardDistribution.btct_awarded)} BTCT.</p>
                      </div>
                    )
                  ) : (
                    <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#14182D] px-3 py-3 text-[12px] text-[#B0B3C6]">
                      Final outcome will appear here once settlement records are available.
                    </div>
                  )}
                  {isCashAuction && !rewardDistribution ? (
                    <div className="mt-3 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#14182D] px-3 py-3 text-[12px] text-[#B0B3C6]">
                      Cash auction winnings are credited to the withdrawal wallet after result processing.
                    </div>
                  ) : null}
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
        auctionBonusBalance={auctionBonusBalance}
        walletReady={walletReady}
        bidMutation={bidMutation}
        onBid={handleBid}
        participantCount={participantCount}
        winners={winners}
      />
    </>
  );
}
