'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LoaderCircle, X } from 'lucide-react';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAutopoolHistory } from '@/lib/services/autopoolService';
import { currency, dateTime } from '@/lib/utils/format';

const PAGE_LIMIT = 10;

function getHistoryMessage(error) {
  const reason = error?.details?.reason;
  const status = Number(error?.status || 0);

  if (reason === 'network' || status === 0) {
    return 'Please check your internet connection.';
  }
  if (reason === 'server' || status >= 500) {
    return 'Server issue. Please try again.';
  }
  return error?.message || 'Server issue. Please try again.';
}

function formatPoolLabel(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) return '-';
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

function shortId(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '-';
  if (normalized.length <= 12) return normalized;
  return `${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={`autopool-history-skeleton-${index}`} className="animate-pulse rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-28 rounded-full bg-white/10" />
            <div className="h-5 w-20 rounded-full bg-white/10" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, rowIndex) => (
              <div key={`autopool-history-skeleton-row-${index}-${rowIndex}`}>
                <div className="h-3 w-14 rounded-full bg-white/8" />
                <div className="mt-2 h-4 w-20 rounded-full bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailItem({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-[12px] font-medium text-white ${mono ? 'font-mono' : ''}`}>{value || '-'}</p>
    </div>
  );
}

function HistoryRow({ item }) {
  const sourceName = item.sourceUser?.displayName || item.metadata?.sourceUsername || '-';
  const completedAt = item.completedAt ? dateTime(item.completedAt) : '-';
  const purchaseDate = item.purchaseDate ? dateTime(item.purchaseDate) : '-';
  const createdAt = item.createdAt ? dateTime(item.createdAt) : '-';

  return (
    <article className="relative overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(160deg,rgba(22,25,38,0.92),rgba(12,14,21,0.96))] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.28)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.06),transparent_28%)]" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/8 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                {item.incomeTypeLabel || 'Autopool Income'}
              </span>
              <span className="rounded-full border border-cyan-400/14 bg-cyan-400/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                Pool {formatPoolLabel(item.poolType || item.packageAmount)}
              </span>
            </div>
          </div>
          <p className="shrink-0 text-[19px] font-semibold tracking-[-0.04em] text-white">{currency(item.amount)}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-left">
          <DetailItem label="Date" value={createdAt} />
          <DetailItem label="Source User" value={sourceName} />
          <DetailItem label="Matrix ID" value={shortId(item.matrixId)} mono />
          <DetailItem label="Purchase" value={purchaseDate} />
          <DetailItem label="Cycle" value={item.cycleNumber ? `#${item.cycleNumber}` : '-'} />
          <DetailItem label="Recycle" value={item.recycleCount === null || item.recycleCount === undefined ? '-' : String(item.recycleCount)} />
          <DetailItem label="Completed" value={completedAt} />
          <DetailItem label="Source Entry" value={shortId(item.sourceEntryId || item.completedEntryId || item.entryId)} mono />
        </div>
      </div>
    </article>
  );
}

export function AutopoolHistoryModal({ open, type, title, onClose }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, type]);

  const historyQuery = useQuery({
    queryKey: queryKeys.autopoolHistory(type || 'total', page, PAGE_LIMIT),
    queryFn: () => getAutopoolHistory({ type, page, limit: PAGE_LIMIT }),
    enabled: open && Boolean(type),
    placeholderData: (previousData) => previousData,
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const items = Array.isArray(historyQuery.data?.items) ? historyQuery.data.items : [];
  const pagination = historyQuery.data?.pagination || {
    page,
    limit: PAGE_LIMIT,
    total: 0
  };
  const totalPages = Math.max(1, Math.ceil(Number(pagination.total || 0) / Math.max(1, Number(pagination.limit || PAGE_LIMIT))));
  const canGoBack = Number(pagination.page || page) > 1;
  const canGoForward = Number(pagination.page || page) < totalPages;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end bg-[rgba(2,6,23,0.9)] px-3 pb-3 pt-8 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4"
        >
          <button
            type="button"
            aria-label="Close autopool history"
            className="absolute inset-0"
            onClick={() => onClose?.()}
          />

          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#121722,#0c1018)] text-white shadow-[0_36px_90px_rgba(0,0,0,0.56)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.08),transparent_24%)]" />

            <div className="relative flex items-center justify-between gap-3 border-b border-white/8 px-4 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-[20px] font-semibold tracking-[-0.04em] text-white">{title}</h2>
              </div>
              <button
                type="button"
                onClick={() => onClose?.()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.05] text-slate-200 transition hover:border-white/14 hover:text-white"
                aria-label="Close history"
              >
                <X size={17} />
              </button>
            </div>

            <div className="relative flex-1 overflow-y-auto px-4 py-4">
              {historyQuery.isPending && !historyQuery.data ? <HistorySkeleton /> : null}

              {historyQuery.isError ? (
                <div className="rounded-[22px] border border-rose-400/16 bg-rose-500/8 p-4 text-center">
                  <p className="text-sm font-medium text-rose-100">{getHistoryMessage(historyQuery.error)}</p>
                  <button
                    type="button"
                    onClick={() => historyQuery.refetch()}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[12px] font-semibold text-white"
                  >
                    <LoaderCircle size={14} />
                    Retry
                  </button>
                </div>
              ) : null}

              {!historyQuery.isError && !historyQuery.isPending && !items.length ? (
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-[13px] font-medium text-slate-300">
                  No autopool data yet.
                </div>
              ) : null}

              {!historyQuery.isError && items.length ? (
                <div className="space-y-3">
                  {items.map((item) => (
                    <HistoryRow key={item.id} item={item} />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative border-t border-white/8 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => canGoBack && setPage((current) => Math.max(1, current - 1))}
                  disabled={!canGoBack}
                  className="inline-flex min-w-[96px] items-center justify-center gap-2 rounded-full border border-white/8 bg-white/[0.05] px-3 py-2 text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronLeft size={15} />
                  Prev
                </button>

                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {Number(pagination.total || 0) > 0 ? `Page ${pagination.page} / ${totalPages}` : 'Page 1 / 1'}
                </p>

                <button
                  type="button"
                  onClick={() => canGoForward && setPage((current) => current + 1)}
                  disabled={!canGoForward}
                  className="inline-flex min-w-[96px] items-center justify-center gap-2 rounded-full border border-white/8 bg-white/[0.05] px-3 py-2 text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
