'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gavel, Sparkles } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { AuctionCard } from '@/components/auctions/AuctionUi';
import { getAuctions } from '@/lib/services/auctionsService';
import { queryKeys } from '@/lib/query/queryKeys';

const tabs = [
  { label: 'Live', value: 'live' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Ended', value: 'ended' },
  { label: 'Cancelled', value: 'cancelled' }
];

export default function AuctionsPage() {
  const [status, setStatus] = useState('live');
  const [search, setSearch] = useState('');

  const auctionsQuery = useQuery({
    queryKey: [...queryKeys.auctions, status, search],
    queryFn: () => getAuctions({ status, search, page: 1, limit: 24 })
  });

  if (auctionsQuery.isError) {
    return <ErrorState message="Auctions could not be loaded." onRetry={auctionsQuery.refetch} />;
  }

  const envelope = auctionsQuery.data || {};
  const auctions = Array.isArray(envelope.data) ? envelope.data : [];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.35),_transparent_45%),linear-gradient(135deg,#0f172a,#111827)] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.24)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80">
          <Sparkles size={12} />
          Admin-curated live bidding
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Auctions</h1>
        <p className="mt-2 max-w-md text-sm text-white/75">Browse upcoming drops, follow live countdowns, and place bids directly from your account.</p>
        <label className="mt-4 block rounded-2xl bg-white/10 p-1.5 backdrop-blur">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search auction title" className="w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none" />
        </label>
      </section>

      <SectionHeader title="Auction Lots" subtitle="Mobile-first live, upcoming, and completed auctions" />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${status === tab.value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {auctionsQuery.isLoading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading auctions...</div> : null}
      {!auctionsQuery.isLoading && auctions.length === 0 ? <EmptyState title="No auctions found" description="Adjust the status filter or search term to find more lots." /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {auctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        <div className="flex items-center gap-2 text-slate-700">
          <Gavel size={14} />
          Bids are accepted only while the auction is live and must stay within the admin-defined $0.50 to $100.00 range.
        </div>
      </div>
    </div>
  );
}
