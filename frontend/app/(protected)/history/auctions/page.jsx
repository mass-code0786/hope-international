'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { AuctionCard, AuctionSummaryGrid } from '@/components/auctions/AuctionUi';
import { getMyAuctionHistory } from '@/lib/services/auctionsService';
import { queryKeys } from '@/lib/query/queryKeys';

const tabs = [
  { label: 'My Bids', value: 'bids' },
  { label: 'Auctions Joined', value: 'joined' },
  { label: 'Won Auctions', value: 'wins' },
  { label: 'Auction History', value: 'history' }
];

function AuctionHistoryContent() {
  const searchParams = useSearchParams();
  const [kind, setKind] = useState('bids');

  useEffect(() => {
    const requested = searchParams.get('kind');
    if (tabs.some((tab) => tab.value === requested)) {
      setKind(requested);
    }
  }, [searchParams]);

  const historyQuery = useQuery({
    queryKey: queryKeys.auctionHistory(kind),
    queryFn: () => getMyAuctionHistory({ kind, page: 1, limit: 100 })
  });

  if (historyQuery.isError) {
    return <ErrorState message="Auction history could not be loaded." onRetry={historyQuery.refetch} />;
  }

  const envelope = historyQuery.data || {};
  const history = Array.isArray(envelope.data) ? envelope.data : [];

  return (
    <div className="space-y-4">
      <SectionHeader title="Auction History" subtitle="My bids, joined auctions, winners, and completed lots" />
      <AuctionSummaryGrid summary={envelope.summary || {}} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button key={tab.value} onClick={() => setKind(tab.value)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${kind === tab.value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {historyQuery.isLoading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading auction history...</div> : null}
      {!historyQuery.isLoading && history.length === 0 ? <EmptyState title="No auction activity yet" description="Join a live auction to start building your auction history." /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {history.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
      </div>
    </div>
  );
}

export default function AuctionHistoryPage() {
  return (
    <Suspense fallback={<div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading auction history...</div>}>
      <AuctionHistoryContent />
    </Suspense>
  );
}
