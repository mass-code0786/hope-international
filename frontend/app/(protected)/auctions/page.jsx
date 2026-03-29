'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock3, RefreshCw, Sparkles } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { AuctionCard } from '@/components/auctions/AuctionUi';
import { getAuctions } from '@/lib/services/auctionsService';
import { queryKeys } from '@/lib/query/queryKeys';

const tabs = [
  { label: 'Live', value: 'live' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Ended', value: 'ended' }
];

function AuctionGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="aspect-[4/4.8] animate-pulse bg-slate-100" />
          <div className="space-y-3 p-3">
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-8 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PremiumEmptyState({ status, search }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.35),_transparent_40%),linear-gradient(180deg,#ffffff,#f8fafc)] px-5 py-8 text-center sm:px-8">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]">
          <Clock3 size={18} />
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Auction Board</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">{status === 'live' ? 'No live auctions available right now' : `No ${status} auctions available right now`}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{search ? 'Try clearing your search or switching tabs to browse other auction windows.' : 'Fresh auction lots will appear here as soon as the next round opens.'}</p>
      </div>
    </section>
  );
}

export default function AuctionsPage() {
  const [status, setStatus] = useState('live');
  const [search, setSearch] = useState('');

  const auctionsQuery = useQuery({
    queryKey: [...queryKeys.auctions, status, search],
    queryFn: () => getAuctions({ status, search, page: 1, limit: 24 })
  });

  const envelope = auctionsQuery.data || {};
  const auctions = Array.isArray(envelope.data) ? envelope.data : [];
  const stats = useMemo(() => ({
    live: status === 'live' ? auctions.length : null,
    upcoming: status === 'upcoming' ? auctions.length : null,
    ended: status === 'ended' ? auctions.length : null
  }), [auctions.length, status]);
  const isEmpty = !auctionsQuery.isLoading && !auctionsQuery.isError && auctions.length === 0;

  return (
    <div className="-mx-4 space-y-3 bg-[#f8fafc] px-3 pb-4 pt-0 sm:mx-0 sm:space-y-4 sm:rounded-2xl sm:border sm:border-slate-200 sm:px-4 sm:py-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
          <Sparkles size={12} />
          Fixed entry auctions
        </div>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">Auctions</h1>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">Browse current lots, track time remaining, and open any item to place a bid.</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`rounded-2xl border px-3 py-2 text-left transition ${status === tab.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-75">{tab.label}</p>
              <p className="mt-1 text-sm font-semibold">{stats[tab.value] ?? 'View'}</p>
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <label className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search auctions" className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
          </label>
          <button onClick={() => auctionsQuery.refetch()} className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600">
            <RefreshCw size={15} />
          </button>
        </div>
      </section>

      <SectionHeader
        title={status === 'live' ? 'Live Auctions' : status === 'upcoming' ? 'Upcoming Auctions' : 'Ended Auctions'}
        subtitle={status === 'live' ? 'Clean auction cards built for quick scanning and fast bidding' : status === 'upcoming' ? 'Scheduled lots opening soon' : 'Recently closed auction results'}
      />

      {auctionsQuery.isLoading ? <AuctionGridSkeleton /> : null}
      {auctionsQuery.isError ? <ErrorState message="Auctions could not be loaded." onRetry={auctionsQuery.refetch} /> : null}
      {isEmpty ? <PremiumEmptyState status={status} search={search} /> : null}

      {!auctionsQuery.isLoading && !auctionsQuery.isError && auctions.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {auctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
        </div>
      ) : null}
    </div>
  );
}
