'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Clock3, Gavel, Trophy, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

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
  if (won) return <Badge variant="success">Won</Badge>;
  return <Badge variant={auctionStatusVariant(status)}>{String(status || 'upcoming').toUpperCase()}</Badge>;
}

export function AuctionCountdown({ startAt, endAt, status }) {
  const target = status === 'upcoming' ? startAt : endAt;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const content = useMemo(() => {
    const diff = new Date(target).getTime() - now;
    if (!target || Number.isNaN(diff)) return 'Time unavailable';
    if (diff <= 0) return status === 'upcoming' ? 'Starting now' : 'Closed';

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }, [target, now, status]);

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-700">
      <Clock3 size={12} />
      {status === 'upcoming' ? 'Starts in' : 'Ends in'} {content}
    </div>
  );
}

export function AuctionCard({ auction }) {
  const cover = auction.image_url || auction.gallery?.[0] || 'https://placehold.co/600x400/e2e8f0/334155?text=Auction';
  const live = auction.computed_status || auction.status;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <div className="relative h-40 bg-slate-100">
        <img src={cover} alt={auction.title} className="h-full w-full object-cover" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <AuctionStatusBadge status={live} won={Boolean(auction.is_winner)} />
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{auction.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{auction.short_description || auction.description || 'Auction lot managed by admin.'}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Current bid</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatAuctionMoney(auction.display_current_bid || auction.current_bid || auction.starting_price)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Starting</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatAuctionMoney(auction.starting_price)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <AuctionCountdown startAt={auction.start_at} endAt={auction.end_at} status={live} />
          <Link href={`/auctions/${auction.id}`} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white">
            <Gavel size={12} />
            {live === 'live' ? 'Bid now' : live === 'upcoming' ? 'Join auction' : 'View result'}
          </Link>
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
