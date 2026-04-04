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
      chip: 'border border-emerald-500/20 bg-[rgba(34,197,94,0.15)] text-[#22c55e]',
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
      chip: 'border border-white/5 bg-[rgba(156,163,175,0.15)] text-[#9ca3af]',
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
    <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/5 bg-[#1f2937] px-2.5 py-1 text-[10px] font-semibold text-[#9ca3af] shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
      <Clock3 size={11} className="shrink-0 text-[#6b7280]" />
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
      frame: 'bg-[#1a1f2e] border-white/5',
      halo: 'bg-[#111827]',
      ring: 'from-[#7c3aed] to-[#22c55e]',
      cta: 'bg-[linear-gradient(135deg,#7c3aed,#22c55e)] text-white shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:brightness-110'
    };
  }
  if (status === 'ended') {
    return {
      frame: 'bg-[#1a1f2e] border-white/5',
      halo: 'bg-[#111827]',
      ring: 'from-[#7c3aed] to-[#22c55e]',
      cta: 'bg-[linear-gradient(135deg,#7c3aed,#22c55e)] text-white shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:brightness-110'
    };
  }

  return {
    frame: 'bg-[#1a1f2e] border-white/5',
    halo: 'bg-[#111827]',
    ring: 'from-[#7c3aed] to-[#22c55e]',
    cta: 'bg-[linear-gradient(135deg,#7c3aed,#22c55e)] text-white shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:brightness-110'
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
  const progressStyle = capacity.hasCapacity ? { background: `conic-gradient(#7c3aed ${capacity.capacityPercent}%, rgba(255,255,255,0.08) 0)` } : { background: 'linear-gradient(135deg, rgba(124,58,237,0.6), rgba(34,197,94,0.45))' };
  const ctaLabel = getAuctionCta(status, won);

  return (
    <article className={`overflow-hidden rounded-[18px] border ${theme.frame} p-2 shadow-[0_10px_30px_rgba(0,0,0,0.4)]`}>
      <div className="flex items-center justify-between gap-2">
        <AuctionCountdown startAt={auction?.start_at} endAt={auction?.end_at} status={status} compact />
        <AuctionStatusBadge status={status} won={won} />
      </div>

      <Link href={`/auctions/${auction?.id}`} className="mt-2 block">
        <div className={`relative rounded-[18px] ${theme.halo} px-2 py-2.5`}>
          <div className="mx-auto mt-[-10px] flex h-[132px] w-[132px] min-w-[120px] max-w-[150px] items-center justify-center rounded-full p-[4px]" style={progressStyle}>
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#1f2937] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
              <div className="flex h-[116px] w-[116px] items-center justify-center overflow-hidden rounded-full bg-[#111827] p-[6px]">
                <img src={cover} alt={auction?.title || 'Auction'} className="h-full w-full rounded-full object-cover" />
              </div>
            </div>
          </div>

          {capacity.hasCapacity ? (
            <div className="mt-1.5 flex justify-center">
              <span className="rounded-full bg-[#1f2937] px-2.5 py-1 text-[9px] font-semibold text-[#9ca3af] shadow-[0_8px_18px_rgba(0,0,0,0.3)]">
                {capacity.capacityPercent}% filled
              </span>
            </div>
          ) : null}
        </div>
      </Link>

      <div className="px-1 pb-0.5 pt-2">
        <Link href={`/auctions/${auction?.id}`}>
          <h3 className="line-clamp-2 min-h-[2rem] text-center text-[10.5px] font-semibold leading-4 text-white">{auction?.title || 'Untitled auction'}</h3>
        </Link>

        <Link href={`/auctions/${auction?.id}`} className={`mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] px-3 text-[12px] font-semibold transition ${theme.cta}`}>
          <span>{ctaLabel}</span>
          <ArrowRight size={14} />
        </Link>

        <div className="mt-1.5 text-center text-[9px] font-medium text-[#9ca3af]">
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
          <article key={card.label} className="rounded-2xl border border-white/5 bg-[#1a1f2e] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1f2937] text-[#9ca3af]"><Icon size={16} /></span>
            <p className="mt-3 text-lg font-semibold text-white">{card.value}</p>
            <p className="text-[11px] text-[#9ca3af]">{card.label}</p>
          </article>
        );
      })}
    </div>
  );
}
