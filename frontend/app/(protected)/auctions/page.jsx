'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { AuctionCard } from '@/components/auctions/AuctionUi';
import { getAuctions, normalizeAuctionStatus } from '@/lib/services/auctionsService';
import { queryKeys } from '@/lib/query/queryKeys';

const tabs = [
  { label: 'All Auctions', value: 'all' },
  { label: 'Live Auctions', value: 'live' },
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

function AuctionGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-[28px] border border-white/80 bg-white p-2.5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="aspect-[0.82] animate-pulse rounded-[22px] bg-gradient-to-br from-slate-100 via-white to-slate-100" />
          <div className="space-y-3 p-2.5">
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-200" />
            <div className="h-12 animate-pulse rounded-[18px] bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyAuctionState() {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.35),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(251,113,133,0.18),_transparent_32%),linear-gradient(180deg,#ffffff,#f8fafc)] px-5 py-8 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_14px_26px_rgba(15,23,42,0.18)]">
          <Sparkles size={18} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">No auctions available</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Try another filter, clear the search, or check back when the next auction round opens.</p>
      </div>
    </section>
  );
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${active ? 'bg-slate-900 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]' : 'border border-slate-200 bg-slate-50 text-slate-700'}`}
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
      <button className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" aria-label="Close filters" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[32px] bg-white px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_50px_rgba(15,23,42,0.18)] animate-[slide-up_220ms_ease-out]">
        <div className="mx-auto h-1.5 w-14 rounded-full bg-slate-200" />
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Filter</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Refine Auctions</h2>
          </div>
          <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600" aria-label="Close filters">
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <FilterChip key={tab.value} active={draftFilters.status === tab.value} onClick={() => setDraftFilters((prev) => ({ ...prev, status: tab.value }))}>
                  {tab.label}
                </FilterChip>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Price Range</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Min</span>
                <input value={draftFilters.minPrice} onChange={(e) => setDraftFilters((prev) => ({ ...prev, minPrice: e.target.value.replace(/[^\d.]/g, '') }))} inputMode="decimal" placeholder="0" className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none" />
              </label>
              <label className="rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Max</span>
                <input value={draftFilters.maxPrice} onChange={(e) => setDraftFilters((prev) => ({ ...prev, maxPrice: e.target.value.replace(/[^\d.]/g, '') }))} inputMode="decimal" placeholder="100" className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none" />
              </label>
            </div>
          </section>

          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Category</p>
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
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sorting</p>
            <div className="space-y-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDraftFilters((prev) => ({ ...prev, sort: option.value }))}
                  className={`flex w-full items-center justify-between rounded-[20px] px-4 py-3 text-left text-sm ${draftFilters.sort === option.value ? 'bg-slate-900 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)]' : 'border border-slate-200 bg-slate-50 text-slate-700'}`}
                >
                  <span>{option.label}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">{draftFilters.sort === option.value ? 'On' : ''}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={onReset} className="inline-flex min-h-[50px] items-center justify-center rounded-[20px] border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-700">Reset</button>
          <button onClick={onApply} className="inline-flex min-h-[50px] items-center justify-center rounded-[20px] bg-slate-900 px-4 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]">Apply</button>
        </div>
      </div>
    </div>
  );
}

export default function AuctionsPage() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);

  const auctionsQuery = useQuery({
    queryKey: [...queryKeys.auctions, status, search],
    queryFn: () => getAuctions({ status, search, page: 1, limit: 100 })
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

  const isEmpty = !auctionsQuery.isLoading && filteredAuctions.length === 0;

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
      <div className="-mx-4 space-y-3 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.20),_transparent_28%),linear-gradient(180deg,#f8fafc,#eef2ff_48%,#f8fafc)] px-3 pb-4 pt-0 sm:mx-0 sm:rounded-[30px] sm:border sm:border-slate-200/80 sm:px-4 sm:py-3">
        <section className="space-y-3 rounded-[30px] border border-white/80 bg-white/76 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Auction Type</p>
              <h1 className="mt-1 text-[20px] font-semibold leading-none text-slate-900">Hope Auctions</h1>
            </div>
            <button
              onClick={() => setFiltersOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
              aria-label="Open filters"
            >
              <SlidersHorizontal size={17} />
              <span className="text-[11px] font-semibold">Filter</span>
              {activeFilterCount ? <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">{activeFilterCount}</span> : null}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  setFilters((prev) => ({ ...prev, status: tab.value }));
                  setDraftFilters((prev) => ({ ...prev, status: tab.value }));
                }}
                className={`shrink-0 rounded-full px-4 py-2.5 text-[11px] font-semibold transition ${status === tab.value ? 'bg-slate-900 text-white shadow-[0_14px_26px_rgba(15,23,42,0.16)]' : 'border border-slate-200 bg-slate-50 text-slate-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 p-2.5">
            <label className="flex min-w-0 flex-1 items-center gap-2 px-1.5">
              <Search size={15} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search auctions"
                className="w-full bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>
            <button
              onClick={() => auctionsQuery.refetch()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
              aria-label="Refresh auctions"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </section>

        {auctionsQuery.isLoading ? <AuctionGridSkeleton /> : null}
        {!auctionsQuery.isLoading && isEmpty ? <EmptyAuctionState /> : null}

        {!auctionsQuery.isLoading && filteredAuctions.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredAuctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
          </div>
        ) : null}
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
