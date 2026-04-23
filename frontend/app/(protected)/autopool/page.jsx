'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowRight, CircleDollarSign, History, Layers3, Network, RefreshCcw } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { enterAutopool, getAutopoolDashboard, getAutopoolHistory } from '@/lib/services/autopoolService';
import { getWallet } from '@/lib/services/walletService';
import { currency, dateTime } from '@/lib/utils/format';

function createRequestId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return null;
}

function entryStatusVariant(status) {
  if (status === 'completed') return 'success';
  if (status === 'active') return 'accent';
  return 'default';
}

function historyTypeLabel(type) {
  return {
    ENTRY: 'Entry',
    EARN: 'Earnings',
    UPLINE: 'Upline income',
    RECYCLE: 'Re-entry',
    AUCTION: 'Auction share'
  }[type] || type;
}

function historyTypeVariant(type) {
  return {
    ENTRY: 'default',
    EARN: 'success',
    UPLINE: 'accent',
    RECYCLE: 'warning',
    AUCTION: 'default'
  }[type] || 'default';
}

function slotDisplayLabel(slot) {
  if (slot?.slotLabel) return slot.slotLabel;
  return {
    1: 'LEFT',
    2: 'MIDDLE',
    3: 'RIGHT'
  }[Number(slot?.slotPosition || 0)] || `SLOT ${slot?.slotPosition || ''}`.trim();
}

function buildHistoryToast(item) {
  if (!item) return 'Autopool updated';
  if (item.type === 'EARN') return `Autopool earnings credited: ${currency(item.amount)}`;
  if (item.type === 'UPLINE') return `Autopool upline income credited: ${currency(item.amount)}`;
  if (item.type === 'RECYCLE') return 'Autopool re-entry activated';
  if (item.type === 'AUCTION') return `Auction wallet share added: ${currency(item.amount)}`;
  if (item.type === 'ENTRY') return `Autopool entry created: ${currency(item.amount)}`;
  return 'Autopool updated';
}

function SlotCard({ slot }) {
  return (
    <div className={`rounded-[24px] border p-4 ${slot?.isEmpty ? 'border-dashed border-slate-200 bg-slate-50' : 'border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]'}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{slotDisplayLabel(slot)}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">Slot {slot.slotPosition}</p>
        </div>
        <Badge variant={slot?.isEmpty ? 'default' : entryStatusVariant(slot.status)}>{slot?.isEmpty ? 'Empty' : slot.status}</Badge>
      </div>
      {slot?.isEmpty ? (
        <p className="mt-6 text-sm text-slate-400">Waiting for the next global FIFO placement.</p>
      ) : (
        <>
          <p className="mt-5 text-lg font-semibold tracking-[-0.04em] text-slate-900">{slot?.user?.displayName || slot?.user?.username || 'Member'}</p>
          <p className="mt-1 text-xs text-slate-500">@{slot?.user?.username || 'member'} | Cycle #{slot?.cycleNumber || 0}</p>
          <p className="mt-5 text-xs uppercase tracking-[0.16em] text-slate-400">Child Fill</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{slot?.fillLabel || '0/3'}</p>
        </>
      )}
    </div>
  );
}

export default function AutopoolPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const historyLimit = 10;
  const latestHistoryIdRef = useRef('');

  const autopoolQuery = useQuery({
    queryKey: queryKeys.autopool,
    queryFn: getAutopoolDashboard,
    placeholderData: (previousData) => previousData,
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.autopoolHistory(page, historyLimit),
    queryFn: () => getAutopoolHistory({ page, limit: historyLimit }),
    placeholderData: (previousData) => previousData,
    refetchInterval: 10000,
    refetchOnWindowFocus: true
  });

  const walletQuery = useQuery({
    queryKey: queryKeys.wallet,
    queryFn: getWallet,
    placeholderData: (previousData) => previousData
  });

  const enterMutation = useMutation({
    mutationFn: (payload) => enterAutopool(payload),
    onSuccess: async (result) => {
      const data = result.data || {};
      const placement = data.placement || null;
      if (data.duplicateRequest) {
        toast.success(result.message || 'Autopool entry was already processed');
      } else if (placement?.isRoot) {
        toast.success('Global autopool root entry created');
      } else if (placement?.slotPosition) {
        toast.success(`Placed in ${placement.slotLabel || `slot ${placement.slotPosition}`} of the next FIFO matrix`);
      } else {
        toast.success(result.message || 'Autopool entry created');
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.autopool }),
        queryClient.invalidateQueries({ queryKey: ['autopool', 'history'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount })
      ]);
    },
    onError: (error) => {
      toast.error(error.message || 'Unable to enter autopool');
    }
  });

  const dashboard = autopoolQuery.data?.data || {};
  const stats = dashboard.stats || {};
  const config = dashboard.config || { entryAmount: 2, matrixType: '1x3', slotsPerEntry: 3 };
  const currentEntry = dashboard.currentEntry || null;
  const activeEntries = Array.isArray(dashboard.activeEntries) ? dashboard.activeEntries : [];
  const historyItems = Array.isArray(historyQuery.data?.data) ? historyQuery.data.data : [];
  const historyPagination = historyQuery.data?.pagination || { page: 1, totalPages: 1 };
  const walletBalance = Number(walletQuery.data?.wallet?.balance || 0);
  const canAfford = walletQuery.isError ? true : walletBalance >= Number(config.entryAmount || 0);

  const hasAutopoolData = Boolean(currentEntry || activeEntries.length || historyItems.length);
  const activeCycleCards = useMemo(() => activeEntries.slice(0, 6), [activeEntries]);

  useEffect(() => {
    const latestId = historyItems[0]?.id || '';
    if (!latestId) return;
    if (!latestHistoryIdRef.current) {
      latestHistoryIdRef.current = latestId;
      return;
    }
    if (latestId !== latestHistoryIdRef.current && !enterMutation.isPending) {
      toast.success(buildHistoryToast(historyItems[0]));
      latestHistoryIdRef.current = latestId;
    }
  }, [historyItems, enterMutation.isPending]);

  if (autopoolQuery.isError && !autopoolQuery.data) {
    return <ErrorState message="Autopool data could not be loaded." onRetry={autopoolQuery.refetch} />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Global Queue"
        title="Global Autopool"
        subtitle="This pool is fully global, serial, and FIFO based. Binary tree, sponsor leg, and referral structure are ignored completely."
        action={(
          <button
            type="button"
            onClick={() => enterMutation.mutate({ requestId: createRequestId() })}
            disabled={enterMutation.isPending || !canAfford}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {enterMutation.isPending ? <RefreshCcw size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            {enterMutation.isPending ? 'Processing...' : `Buy Pool ${currency(config.entryAmount || 0)}`}
          </button>
        )}
      />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard compact title="Current Fill" value={currentEntry?.fillLabel || stats.currentFillLabel || '0/3'} right={<Layers3 size={18} className="text-cyan-500" />} uppercaseTitle={false} />
        <StatCard compact title="Total Earnings" value={currency(stats.totalEarnings || 0)} right={<CircleDollarSign size={18} className="text-emerald-500" />} uppercaseTitle={false} />
        <StatCard compact title="Total Recycles" value={stats.totalRecycles || 0} right={<RefreshCcw size={18} className="text-amber-500" />} uppercaseTitle={false} />
        <StatCard compact title="Completed Cycles" value={stats.completedCycles || 0} right={<Network size={18} className="text-sky-500" />} uppercaseTitle={false} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Current Matrix</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-900">
                {currentEntry ? `Cycle #${currentEntry.cycleNumber}` : 'No active cycle'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Entry {currency(config.entryAmount || 0)} | Matrix {config.matrixType || '1x3'}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                Top to Bottom | Left to Right
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-right shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Wallet Available</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{currency(walletBalance)}</p>
            </div>
          </div>

          {!currentEntry ? (
            <div className="mt-6">
              <EmptyState
                title="No autopool entry yet"
                description="Buy your first global autopool slot to join the FIFO queue. Placement will ignore the binary tree completely."
                action={(
                  <button
                    type="button"
                    onClick={() => enterMutation.mutate({ requestId: createRequestId() })}
                    disabled={enterMutation.isPending || !canAfford}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <ArrowRight size={15} />
                    Buy Pool {currency(config.entryAmount || 0)}
                  </button>
                )}
              />
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,#f8fafc,white)] p-5">
                <div className="mx-auto max-w-[280px] rounded-[28px] border border-slate-200 bg-slate-900 p-5 text-center text-white shadow-[0_18px_42px_rgba(15,23,42,0.2)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">You</p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.05em]">{currentEntry?.user?.displayName || 'Member'}</p>
                  <p className="mt-1 text-sm text-white/70">@{currentEntry?.user?.username || 'member'} | {currentEntry.fillLabel}</p>
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {(currentEntry.children || []).map((slot) => (
                    <SlotCard key={`${currentEntry.id}-${slot.slotPosition}`} slot={slot} />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge variant={entryStatusVariant(currentEntry.status)}>{currentEntry.status}</Badge>
                <span>Cycle #{currentEntry.cycleNumber}</span>
                <span>Recycle count {currentEntry.recycleCount}</span>
                {currentEntry.parent ? <span>Autopool parent: {currentEntry.parent.user?.displayName || currentEntry.parent.user?.username || 'Member'}</span> : <span>Root entry in the global pool</span>}
              </div>
            </>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Pool Rules</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-900">Global FIFO Flow</h3>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Network size={18} />
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>All entries join one global queue. The oldest incomplete matrix gets the next slot every time.</p>
              <p>Matrix slots always fill in this order: 1 LEFT, 2 MIDDLE, 3 RIGHT.</p>
              <p>When a cycle reaches 3/3, the owner earns {currency(config.ownerPayout || 1.5)}, the autopool upline earns {currency(config.uplinePayout || 0.5)}, {currency(config.auctionShare || 2)} goes to the auction wallet, and {currency(config.recycleAmount || 2)} creates a brand-new recycle entry instead of crediting a wallet.</p>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Active Cycles</p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-900">{activeEntries.length} open cycle{activeEntries.length === 1 ? '' : 's'}</h3>
              </div>
              <Badge variant="accent">{config.matrixType || '1x3'}</Badge>
            </div>

            {!activeCycleCards.length ? (
              <p className="mt-4 text-sm text-slate-500">No active cycles yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {activeCycleCards.map((entry) => (
                  <div key={entry.id} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Cycle #{entry.cycleNumber}</p>
                        <p className="mt-1 text-xs text-slate-500">{entry.fillLabel} filled | {entry.entrySource} | Recycles {entry.recycleCount}</p>
                      </div>
                      <Badge variant={entryStatusVariant(entry.status)}>{entry.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Autopool History</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-900">Entry, earnings, upline, recycle, and auction share</h2>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <History size={18} />
          </span>
        </div>

        {historyQuery.isError && !historyQuery.data ? (
          <div className="mt-5">
            <ErrorState message="Autopool history could not be loaded." onRetry={historyQuery.refetch} />
          </div>
        ) : null}

        {!historyItems.length && !historyQuery.isLoading ? (
          <div className="mt-5">
            <EmptyState title="No autopool history yet" description="Your entry purchases, earnings, upline income, re-entries, and auction shares will appear here." />
          </div>
        ) : null}

        {historyItems.length ? (
          <>
            <div className="mt-5 space-y-3">
              {historyItems.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={historyTypeVariant(item.type)}>{historyTypeLabel(item.type)}</Badge>
                        {item.cycle_number ? <span className="text-xs text-slate-500">Cycle #{item.cycle_number}</span> : null}
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{currency(item.amount)}</p>
                      <p className="mt-1 text-xs text-slate-500">{dateTime(item.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reference</p>
                      <p className="mt-1 text-xs text-slate-700">{item.entry_id ? String(item.entry_id).slice(0, 8) : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-sm text-slate-500">Page {historyPagination.page || page} of {historyPagination.totalPages || 1}</p>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= Number(historyPagination.totalPages || 1)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </section>

      {!hasAutopoolData && walletQuery.isError ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Wallet data is unavailable right now. The buy action still validates on the server before any autopool entry is created.
        </div>
      ) : null}
    </div>
  );
}
