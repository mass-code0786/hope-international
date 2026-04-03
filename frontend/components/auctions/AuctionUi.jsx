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
    <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/92 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.08)]">
      <Clock3 size={11} className="shrink-0 text-slate-500" />
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

function getAuctionCapacity(auction) {
  const totalCapacity = Number(auction?.totalCapacity ?? 0);
  const capacityFilled = Math.max(0, Number(auction?.capacityFilled ?? auction?.total_entries ?? 0));
  const safeTotalCapacity = Math.max(0, totalCapacity);
  const capacityRemaining = safeTotalCapacity > 0
    ? Math.max(0, Number(auction?.capacityRemaining ?? (safeTotalCapacity - capacityFilled)))
    : 0;
  const capacityPercent = safeTotalCapacity > 0
    ? Math.max(0, Math.min(100, Number(auction?.capacityPercent ?? Math.round((capacityFilled / safeTotalCapacity) * 100))))
    : 0;

  return {
    totalCapacity: safeTotalCapacity,
    capacityFilled,
    capacityRemaining,
    capacityPercent,
    hasCapacity: safeTotalCapacity > 0
  };
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
      frame: 'from-[#fff7f7] via-[#ffffff] to-[#fff1f2]',
      halo: 'from-[#fee2e2] via-[#fff7ed] to-[#ffffff]',
      ring: 'from-[#f97316] to-[#ef4444]',
      cta: 'bg-slate-900 text-white'
    };
  }
  if (status === 'ended') {
    return {
      frame: 'from-[#f8fafc] via-[#ffffff] to-[#f1f5f9]',
      halo: 'from-[#e2e8f0] via-[#f8fafc] to-[#ffffff]',
      ring: 'from-[#94a3b8] to-[#cbd5e1]',
      cta: 'bg-slate-900 text-white'
    };
  }

  return {
    frame: 'from-[#eff6ff] via-[#ffffff] to-[#eef2ff]',
    halo: 'from-[#dbeafe] via-[#ecfeff] to-[#ffffff]',
    ring: 'from-[#38bdf8] to-[#2563eb]',
    cta: 'bg-slate-900 text-white'
  };
}

export function AuctionCard({ auction }) {
  const images = getAuctionImages(auction);
  const cover = images[0] || 'https://placehold.co/900x900/e2e8f0/334155?text=Auction';
  const status = normalizeAuctionStatus(auction?.storefront_status, auction?.computed_status, auction?.status);
  const won = Boolean(auction?.is_winner || auction?.isWinner);
  const theme = getCardTheme(status);
  const price = formatAuctionMoney(getAuctionPrice(auction));
  const capacity = getAuctionCapacity(auction);
  const progressStyle = capacity.hasCapacity ? { background: `conic-gradient(#0f172a ${capacity.capacityPercent}%, #e2e8f0 0)` } : { background: 'linear-gradient(135deg, #cbd5e1, #e2e8f0)' };
  const ctaLabel = getAuctionCta(status, won);

  return (
    <article className={`overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-b ${theme.frame} p-3 shadow-[0_16px_34px_rgba(15,23,42,0.07)]`}>
      <div className="flex items-center justify-between gap-2">
        <AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} compact />
        <AuctionStatusBadge status={status} won={won} />
      </div>

      <Link href={`/auctions/${auction?.id}`} className="mt-4 block">
        <div className={`relative rounded-[26px] bg-gradient-to-br ${theme.halo} px-2 py-4`}>
          <div className="mx-auto flex h-[128px] w-[128px] items-center justify-center rounded-full p-[7px]" style={progressStyle}>
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-[0_14px_28px_rgba(15,23,42,0.10)]">
              <div className="flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-full bg-white">
                <img src={cover} alt={auction?.title || 'Auction'} className="h-full w-full object-contain" />
              </div>
            </div>
          </div>

          {capacity.hasCapacity ? (
            <div className="mt-3 flex justify-center">
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                {capacity.capacityPercent}% filled
              </span>
            </div>
          ) : null}
        </div>
      </Link>

      <div className="px-1 pb-1 pt-4">
        <Link href={`/auctions/${auction?.id}`}>
          <h3 className="line-clamp-2 min-h-[2.7rem] text-center text-[13px] font-semibold leading-5 text-slate-900">{auction?.title || 'Untitled auction'}</h3>
        </Link>

        <Link href={`/auctions/${auction?.id}`} className={`mt-4 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-full px-3 py-2.5 text-[12px] font-semibold shadow-[0_14px_26px_rgba(15,23,42,0.12)] ${theme.cta}`}>
          <span>{ctaLabel}</span>
          <ArrowRight size={14} />
        </Link>

        <div className="mt-2 text-center text-[10px] font-medium text-slate-500">
          Entry {price}
        </div>
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
