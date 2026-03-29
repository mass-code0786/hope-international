'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Clock3, Gavel, Trophy, Users, Package, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { normalizeAuctionStatus } from '@/lib/services/auctionsService';

export function formatAuctionMoney(value = 0) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function auctionStatusVariant(status) {
  if (status === 'live') return 'danger';
  if (status === 'ended') return 'default';
  if (status === 'cancelled') return 'warning';
  return 'accent';
}

export function AuctionStatusBadge({ status, won = false }) {
  const safeStatus = normalizeAuctionStatus(status);
  if (won) return <Badge variant="success">Won</Badge>;
  return <Badge variant={auctionStatusVariant(safeStatus)}>{String(safeStatus).toUpperCase()}</Badge>;
}

export function AuctionCountdown({ startAt, endAt, status, compact = false }) {
  const safeStatus = normalizeAuctionStatus(status);
  const target = safeStatus === 'upcoming' ? startAt : endAt;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (safeStatus === 'ended' || safeStatus === 'cancelled') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [safeStatus]);

  const content = useMemo(() => {
    if (safeStatus === 'ended') return 'Ended';
    if (safeStatus === 'cancelled') return 'Cancelled';
    if (!target) return 'Time unavailable';

    const diff = new Date(target).getTime() - now;
    if (Number.isNaN(diff)) return 'Time unavailable';
    if (diff <= 0) return safeStatus === 'upcoming' ? 'Starting now' : 'Closing now';

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (compact) return `${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }, [target, now, safeStatus, compact]);

  const prefix = safeStatus === 'upcoming' ? 'Starts' : safeStatus === 'live' ? 'Ends' : null;

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-700">
      <Clock3 size={11} />
      {prefix ? `${prefix} ${compact ? '' : 'in '}${content}`.trim() : content}
    </div>
  );
}

function getAuctionImages(auction) {
  const ownGallery = Array.isArray(auction?.gallery) ? auction.gallery.filter(Boolean) : [];
  const productGallery = Array.isArray(auction?.product_gallery) ? auction.product_gallery.filter(Boolean) : [];
  const primary = auction?.image_url || ownGallery[0] || auction?.product_image_url || productGallery[0] || '';
  const rest = [...ownGallery, ...productGallery].filter((item) => item && item !== primary);
  return primary ? [primary, ...rest] : [];
}

function getAuctionPrice(auction) {
  return auction?.display_price ?? auction?.entry_price ?? auction?.display_current_bid ?? auction?.starting_price ?? 0;
}

function getAuctionCta(status) {
  if (status === 'live') return 'Bid now';
  if (status === 'upcoming') return 'View';
  if (status === 'ended') return 'Results';
  return 'Details';
}

export function AuctionCard({ auction }) {
  const images = getAuctionImages(auction);
  const cover = images[0] || 'https://placehold.co/600x400/e2e8f0/334155?text=Auction';
  const status = normalizeAuctionStatus(auction?.storefront_status, auction?.computed_status, auction?.status);
  const winnerCount = Array.isArray(auction?.winners) ? auction.winners.length : Number(auction?.winner_count || 0);
  const rewardText = auction?.reward_mode === 'split' ? 'Shared reward' : `${auction?.stock_quantity || 1} stock`;
  const description = auction?.short_description || auction?.description || auction?.product_description || 'Admin managed fixed-entry auction.';

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="relative flex gap-3 p-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-28 sm:w-28">
          <img src={cover} alt={auction?.title || 'Auction'} className="h-full w-full object-cover" />
          <div className="absolute left-2 top-2">
            <AuctionStatusBadge status={status} won={Boolean(auction?.is_winner || auction?.isWinner)} />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h3 className="line-clamp-2 text-[13px] font-semibold leading-4 text-slate-900 sm:text-sm">{auction?.title || 'Untitled auction'}</h3>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{description}</p>
          </div>

          <div className="flex items-end justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-400">Fixed bid price</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{formatAuctionMoney(getAuctionPrice(auction))}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-400">Entries</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{Number(auction?.total_entries || 0)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><Users size={11} /> {Number(auction?.total_bids || 0)} bids</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><Package size={11} /> {rewardText}</span>
            {status === 'live' || status === 'upcoming' ? <AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} compact /> : <AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} compact />}
          </div>

          {winnerCount > 0 ? <p className="text-[10px] font-medium text-emerald-700">{winnerCount} winner{winnerCount > 1 ? 's' : ''} declared</p> : null}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5">
        <span className="text-[10px] font-medium text-slate-500">{status === 'live' ? 'Entry window open' : status === 'upcoming' ? 'Auction scheduled' : 'Auction closed'}</span>
        <Link href={`/auctions/${auction?.id}`} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white">
          {getAuctionCta(status)}
          <ArrowRight size={12} />
        </Link>
      </div>
    </article>
  );
}

export function AuctionSummaryGrid({ summary = {} }) {
  const cards = [
    { label: 'My Bids', value: summary.my_bids ?? 0, icon: Gavel },
    { label: 'Auctions Joined', value: summary.auctions_joined ?? 0, icon: Users },
    { label: 'Won Auctions', value: summary.won_auctions ?? 0, icon: Trophy },
    { label: 'Auction History', value: summary.auction_history ?? 0, icon: Clock3 }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Icon size={16} /></span>
            <p className="mt-3 text-lg font-semibold text-slate-900">{card.value}</p>
            <p className="text-[11px] text-slate-500">{card.label}</p>
          </article>
        );
      })}
    </div>
  );
}
