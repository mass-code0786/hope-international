'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, Gavel, Trophy, Users } from 'lucide-react';
import { normalizeAuctionStatus } from '@/lib/services/auctionsService';

export function formatAuctionMoney(value = 0) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function auctionStatusVariant(status) {
  if (status === 'live') return 'live';
  if (status === 'ended') return 'ended';
  if (status === 'cancelled') return 'cancelled';
  return 'upcoming';
}

function getStatusPalette(status, won = false) {
  if (won) {
    return {
      chip: 'border-emerald-200 bg-emerald-500 text-white',
      label: 'Won'
    };
  }

  const safeStatus = normalizeAuctionStatus(status);
  if (safeStatus === 'live') {
    return {
      chip: 'border-rose-200 bg-rose-500 text-white',
      label: 'LIVE'
    };
  }
  if (safeStatus === 'ended') {
    return {
      chip: 'border-slate-200 bg-slate-900 text-white',
      label: 'ENDED'
    };
  }
  if (safeStatus === 'cancelled') {
    return {
      chip: 'border-amber-200 bg-amber-400 text-slate-900',
      label: 'CANCELLED'
    };
  }

  return {
    chip: 'border-sky-200 bg-sky-500 text-white',
    label: 'UPCOMING'
  };
}

export function AuctionStatusBadge({ status, won = false }) {
  const palette = getStatusPalette(status, won);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-bold tracking-[0.2em] shadow-[0_8px_18px_rgba(15,23,42,0.12)] ${palette.chip}`}>
      {palette.label}
    </span>
  );
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

    if (days > 0) return `${days}d ${hours}h`;
    if (compact) return `${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }, [target, now, safeStatus, compact]);

  const prefix = safeStatus === 'upcoming' ? 'Starts' : safeStatus === 'live' ? 'Ends' : null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/88 px-2.5 py-1 text-[10px] font-semibold text-slate-800 shadow-[0_10px_22px_rgba(15,23,42,0.12)] backdrop-blur-sm">
      <Clock3 size={11} className="text-slate-500" />
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

function getAuctionCta(status, won = false) {
  if (won) return 'Win Now';
  if (status === 'live') return 'Bid Now';
  if (status === 'upcoming') return 'Join Soon';
  if (status === 'ended') return 'View Result';
  return 'View Detail';
}

function getCardTheme(status) {
  if (status === 'live') {
    return {
      frame: 'from-[#fff1f2] via-[#ffffff] to-[#ffe4e6]',
      image: 'from-[#fff7ed] via-[#fff1f2] to-[#fee2e2]',
      cta: 'from-[#ef4444] to-[#f97316]'
    };
  }
  if (status === 'ended') {
    return {
      frame: 'from-[#f8fafc] via-[#ffffff] to-[#e2e8f0]',
      image: 'from-[#e2e8f0] via-[#f8fafc] to-[#eef2ff]',
      cta: 'from-[#0f172a] to-[#334155]'
    };
  }

  return {
    frame: 'from-[#eff6ff] via-[#ffffff] to-[#eef2ff]',
    image: 'from-[#e0f2fe] via-[#ecfeff] to-[#dbeafe]',
    cta: 'from-[#0284c7] to-[#0ea5e9]'
  };
}

export function AuctionCard({ auction }) {
  const images = getAuctionImages(auction);
  const cover = images[0] || 'https://placehold.co/900x900/e2e8f0/334155?text=Auction';
  const status = normalizeAuctionStatus(auction?.storefront_status, auction?.computed_status, auction?.status);
  const won = Boolean(auction?.is_winner || auction?.isWinner);
  const theme = getCardTheme(status);
  const price = formatAuctionMoney(getAuctionPrice(auction));

  return (
    <article className={`overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-b ${theme.frame} p-2.5 shadow-[0_18px_40px_rgba(15,23,42,0.10)]`}>
      <div className={`relative overflow-hidden rounded-[22px] bg-gradient-to-br ${theme.image} px-3 pb-3 pt-12`}>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} compact />
          <AuctionStatusBadge status={status} won={won} />
        </div>

        <Link href={`/auctions/${auction?.id}`} className="block">
          <div className="mx-auto flex aspect-square max-w-[152px] items-center justify-center rounded-full bg-white/75 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_30px_rgba(15,23,42,0.10)] backdrop-blur-sm">
            <img src={cover} alt={auction?.title || 'Auction'} className="h-full w-full object-contain" />
          </div>
        </Link>
      </div>

      <div className="px-1 pb-1 pt-3">
        <Link href={`/auctions/${auction?.id}`}>
          <h3 className="line-clamp-2 min-h-[2.7rem] text-[12px] font-semibold leading-5 text-slate-900">{auction?.title || 'Untitled auction'}</h3>
        </Link>

        <Link href={`/auctions/${auction?.id}`} className={`mt-3 inline-flex w-full items-center justify-between gap-2 rounded-[18px] bg-gradient-to-r ${theme.cta} px-3 py-3 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]`}>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold leading-none">{getAuctionCta(status, won)}</span>
            <span className="mt-1 block text-[10px] text-white/80">Entry {price}</span>
          </span>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/18">
            <ArrowRight size={14} />
          </span>
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
