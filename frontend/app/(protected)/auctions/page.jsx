'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock3, Search, SlidersHorizontal, Sparkles, Trophy, X } from 'lucide-react';
import { AuctionCard } from '@/components/auctions/AuctionUi';
import { ErrorState } from '@/components/ui/ErrorState';
import { getAuctionCards, normalizeAuctionStatus } from '@/lib/services/auctionsService';
import { queryKeys } from '@/lib/query/queryKeys';
import { AUCTIONS_PAGE_LIMIT, LIST_SNAPSHOT_TTL_MS } from '@/lib/constants/catalog';
import { readListSnapshot, writeListSnapshot } from '@/lib/utils/listSnapshot';

const tabs = [
  { label: 'All Auctions', value: 'all' },
  { label: 'Live', value: 'live' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Ended', value: 'ended' }
];

const sortOptions = [
  { label: 'Ending soon', value: 'ending-soon' },
  { label: 'Lowest price', value: 'lowest-price' },
  { label: 'Newest', value: 'newest' }
];

const EMPTY_FILTERS = {
  status: 'all',
  minPrice: '',
  maxPrice: '',
  category: 'all',
  sort: 'ending-soon'
};

function getAuctionPrice(auction) {
  return Number(auction?.display_price ?? auction?.entry_price ?? auction?.display_current_bid ?? auction?.starting_price ?? 0);
}

function getAuctionCategory(auction) {
  return String(auction?.category || 'General').trim() || 'General';
}

function getAuctionTimestamp(auction, kind) {
  const value = kind === 'end'
    ? auction?.end_at || auction?.ends_at
    : auction?.created_at || auction?.start_at || auction?.createdAt;
  const stamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(stamp) ? stamp : 0;
}

function EmptyAuctionState() {
  return (
    <section className="rounded-[28px] border border-white/5 bg-[#1a1f2e] p-6 text-center shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#1f2937] text-white">
        <Sparkles size={18} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">No auctions available</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#9ca3af]">Try another tab, clear the search, or check back when the next auction round opens.</p>
    </section>
  );
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${active ? 'bg-[linear-gradient(135deg,#7c3aed,#22c55e)] text-white shadow-[0_6px_20px_rgba(124,58,237,0.4)]' : 'border border-white/5 bg-[#1f2937] text-[#9ca3af]'}`}
    >
      {children}
    </button>
  );
}

function FilterSheet({ open, draftFilters, setDraftFilters, categories, onApply, onClose, onReset }) {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button type="button" className="absolute inset-0 bg-black/55" aria-label="Close filters" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[30px] border border-white/5 bg-[#111827] px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_40px_rgba(0,0,0,0.5)]">
        <div className="mx-auto h-1.5 w-14 rounded-full bg-[#374151]" />
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7280]">Filter</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Refine Auctions</h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/5 bg-[#1f2937] text-[#9ca3af]" aria-label="Close filters">
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Status</p>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <FilterChip key={tab.value} active={draftFilters.status === tab.value} onClick={() => setDraftFilters((prev) => ({ ...prev, status: tab.value }))}>
                  {tab.label}
                </FilterChip>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Price Range</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="rounded-[20px] border border-white/5 bg-[#1f2937] px-3 py-3">
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#6b7280]">Min</span>
                <input value={draftFilters.minPrice} onChange={(e) => setDraftFilters((prev) => ({ ...prev, minPrice: e.target.value.replace(/[^\d.]/g, '') }))} inputMode="decimal" placeholder="0" className="mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-[#6b7280]" />
              </label>
              <label className="rounded-[20px] border border-white/5 bg-[#1f2937] px-3 py-3">
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#6b7280]">Max</span>
                <input value={draftFilters.maxPrice} onChange={(e) => setDraftFilters((prev) => ({ ...prev, maxPrice: e.target.value.replace(/[^\d.]/g, '') }))} inputMode="decimal" placeholder="100" className="mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-[#6b7280]" />
              </label>
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Category</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={draftFilters.category === 'all'} onClick={() => setDraftFilters((prev) => ({ ...prev, category: 'all' }))}>All</FilterChip>
              {categories.map((category) => (
                <FilterChip key={category} active={draftFilters.category === category} onClick={() => setDraftFilters((prev) => ({ ...prev, category }))}>
                  {category}
                </FilterChip>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Sorting</p>
            <div className="space-y-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDraftFilters((prev) => ({ ...prev, sort: option.value }))}
                  className={`flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-left text-sm ${draftFilters.sort === option.value ? 'bg-[linear-gradient(135deg,#7c3aed,#22c55e)] text-white shadow-[0_6px_20px_rgba(124,58,237,0.35)]' : 'border border-white/5 bg-[#1f2937] text-[#9ca3af]'}`}
                >
                  <span>{option.label}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">{draftFilters.sort === option.value ? 'On' : ''}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={onReset} className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] border border-white/5 bg-[#1f2937] px-4 text-sm font-semibold text-[#9ca3af]">Reset</button>
          <button type="button" onClick={onApply} className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-4 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(124,58,237,0.4)]">Apply</button>
        </div>
      </div>
    </div>
  );
}

export default function AuctionsPage() {
  const router = useRouter();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const requestStatus = status === 'all' ? undefined : status;
  const deferredSearch = useDeferredValue(search);
  const snapshotKey = `auction-cards:${requestStatus || 'all'}:${deferredSearch || ''}`;

  const auctionsQuery = useQuery({
    queryKey: [...queryKeys.auctions, 'cards', requestStatus || 'all', deferredSearch],
    queryFn: async () => writeListSnapshot(
      snapshotKey,
      await getAuctionCards({ status: requestStatus, search: deferredSearch, page: 1, limit: AUCTIONS_PAGE_LIMIT, includeTotal: false, view: 'card' })
    ),
    initialData: () => readListSnapshot(snapshotKey, { maxAgeMs: LIST_SNAPSHOT_TTL_MS }) || undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 45_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const envelope = auctionsQuery.data || {};
  const auctions = Array.isArray(envelope.data) ? envelope.data : [];

  const categories = useMemo(() => {
    const unique = new Set();
    auctions.forEach((auction) => {
      const category = getAuctionCategory(auction);
      if (category) unique.add(category);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [auctions]);

  const filteredAuctions = useMemo(() => {
    const minPrice = filters.minPrice ? Number(filters.minPrice) : null;
    const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : null;
    const next = auctions.filter((auction) => {
      const safeStatus = normalizeAuctionStatus(auction?.storefront_status, auction?.computed_status, auction?.status);
      const price = getAuctionPrice(auction);
      const category = getAuctionCategory(auction);
      if (filters.status !== 'all' && safeStatus !== filters.status) return false;
      if (filters.category !== 'all' && category !== filters.category) return false;
      if (minPrice !== null && !Number.isNaN(minPrice) && price < minPrice) return false;
      if (maxPrice !== null && !Number.isNaN(maxPrice) && price > maxPrice) return false;
      return true;
    });

    next.sort((a, b) => {
      if (filters.sort === 'lowest-price') return getAuctionPrice(a) - getAuctionPrice(b);
      if (filters.sort === 'newest') return getAuctionTimestamp(b, 'start') - getAuctionTimestamp(a, 'start');
      return getAuctionTimestamp(a, 'end') - getAuctionTimestamp(b, 'end');
    });

    return next;
  }, [auctions, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count += 1;
    if (filters.minPrice) count += 1;
    if (filters.maxPrice) count += 1;
    if (filters.category !== 'all') count += 1;
    if (filters.sort !== 'ending-soon') count += 1;
    return count;
  }, [filters]);

  const isLoadingList = auctionsQuery.isPending && !auctionsQuery.data;
  const isEmpty = !isLoadingList && !auctionsQuery.isError && filteredAuctions.length === 0;

  const applyFilters = () => {
    setFilters(draftFilters);
    if (draftFilters.status !== status) setStatus(draftFilters.status);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setStatus('all');
  };

  return (
    <>
      <div className="-mx-4 min-h-screen bg-[linear-gradient(180deg,#0b0f1a,#111827)] px-4 pb-24 pt-2 sm:mx-0 sm:rounded-[32px] sm:border sm:border-white/5 sm:px-5 sm:py-4">
        <div className="mx-auto max-w-xl space-y-4">
          <section className="rounded-[28px] border border-white/5 bg-[#1a1f2e] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/5 bg-[#1f2937] text-white"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Win Now</p>
                <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-white">Auctions</h1>
              </div>

              <Link
                href="/history/auctions"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/5 bg-[#1f2937] text-[#22c55e] shadow-[0_10px_24px_rgba(0,0,0,0.3)]"
                aria-label="Open auction history hub"
              >
                <Trophy size={18} />
              </Link>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/5 bg-[#1a1f2e] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Auction Type</p>
                <p className="mt-1 text-[15px] font-semibold text-white">Browse active listings</p>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/5 bg-[#1f2937] px-3 text-white"
                aria-label="Open filters"
              >
                <SlidersHorizontal size={16} />
                <span className="text-[11px] font-semibold">Filter</span>
                {activeFilterCount ? <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-1.5 text-[10px] font-semibold text-white">{activeFilterCount}</span> : null}
              </button>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setStatus(tab.value);
                    setFilters((prev) => ({ ...prev, status: tab.value }));
                    setDraftFilters((prev) => ({ ...prev, status: tab.value }));
                  }}
                  className={`shrink-0 rounded-full px-4 py-2.5 text-[11px] font-semibold transition ${status === tab.value ? 'bg-[linear-gradient(135deg,#7c3aed,#22c55e)] text-white shadow-[0_6px_20px_rgba(124,58,237,0.4)]' : 'border border-white/5 bg-[#1f2937] text-[#9ca3af]'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-full border border-white/5 bg-[#1f2937] px-3 py-2.5">
              <Search size={15} className="shrink-0 text-[#6b7280]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search auctions"
                className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-[#6b7280]"
              />
              <span className="inline-flex items-center gap-1 rounded-full bg-[#111827] px-2 py-1 text-[10px] font-semibold text-[#9ca3af]">
                <Clock3 size={11} />
                {filteredAuctions.length}
              </span>
            </div>
          </section>

          {!isLoadingList && auctionsQuery.isError ? (
            <ErrorState message="Auction list could not be loaded." onRetry={auctionsQuery.refetch} />
          ) : null}
          {!isLoadingList && isEmpty ? <EmptyAuctionState /> : null}

          {!isLoadingList && !auctionsQuery.isError && filteredAuctions.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredAuctions.map((auction, index) => <AuctionCard key={auction.id} auction={auction} prioritizeImage={index < 4} />)}
            </div>
          ) : null}
        </div>
      </div>

      <FilterSheet
        open={filtersOpen}
        draftFilters={draftFilters}
        setDraftFilters={setDraftFilters}
        categories={categories}
        onApply={applyFilters}
        onClose={() => setFiltersOpen(false)}
        onReset={resetFilters}
      />
    </>
  );
}
