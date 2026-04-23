'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowRight, RefreshCcw } from 'lucide-react';
import { ErrorState } from '@/components/ui/ErrorState';
import { queryKeys } from '@/lib/query/queryKeys';
import { enterAutopool, getAutopoolDashboard } from '@/lib/services/autopoolService';
import { getWallet } from '@/lib/services/walletService';
import { currency } from '@/lib/utils/format';

const MATRIX_SLOTS = 3;
const SLOT_LABELS = ['LEFT', 'MIDDLE', 'RIGHT'];

function createRequestId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return null;
}

function clampFilledSlots(value) {
  return Math.max(0, Math.min(MATRIX_SLOTS, Number(value || 0)));
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-[#1f232b] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9ca3af]">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">{value}</p>
    </div>
  );
}

function MatrixSlot({ filled, label, highlighted }) {
  return (
    <div className="space-y-2 text-center">
      <div
        className={[
          'aspect-square rounded-[24px] border transition-all duration-300',
          filled
            ? 'border-[#2563eb] bg-[#2563eb] shadow-[0_18px_40px_rgba(37,99,235,0.34)]'
            : 'border-[#e5e7eb] bg-[#f5f5f5] shadow-[0_12px_28px_rgba(0,0,0,0.18)]',
          highlighted ? 'scale-[1.04] shadow-[0_22px_48px_rgba(37,99,235,0.34)]' : ''
        ].join(' ')}
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">{label}</p>
    </div>
  );
}

export default function AutopoolPage() {
  const queryClient = useQueryClient();
  const completionTimersRef = useRef([]);
  const previousEntryRef = useRef({
    entryId: null,
    cycleNumber: 0,
    recycleCount: 0
  });

  const [displayFilledSlots, setDisplayFilledSlots] = useState(0);
  const [completionEffectActive, setCompletionEffectActive] = useState(false);

  const autopoolQuery = useQuery({
    queryKey: queryKeys.autopool,
    queryFn: getAutopoolDashboard,
    placeholderData: (previousData) => previousData,
    staleTime: 4000,
    refetchInterval: 5000,
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
      const placement = result.data?.placement || null;
      if (placement?.isRoot) {
        toast.success('Global autopool entry created');
      } else if (placement?.slotPosition) {
        toast.success(`Placed in ${placement.slotLabel || `slot ${placement.slotPosition}`}`);
      } else {
        toast.success(result.message || 'Autopool entry created');
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.autopool }),
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
  const config = dashboard.config || { entryAmount: 2, matrixType: '1x3' };
  const stats = dashboard.stats || {};
  const currentEntry = dashboard.currentEntry || null;
  const walletBalance = Number(walletQuery.data?.wallet?.balance || 0);
  const canAfford = walletQuery.isError ? true : walletBalance >= Number(config.entryAmount || 0);

  const actualFilledSlots = clampFilledSlots(currentEntry?.filledSlotsCount ?? stats.currentFillCount ?? 0);
  const cycleNumber = Number(currentEntry?.cycleNumber || stats.currentCycleNumber || 0);
  const recycleCount = Number(currentEntry?.recycleCount || stats.currentRecycleCount || 0);
  const matrixType = currentEntry?.matrixType || config.matrixType || '1x3';
  const earnings = Number(stats.totalEarnings || 0);

  useEffect(() => {
    completionTimersRef.current.forEach((timer) => clearTimeout(timer));
    completionTimersRef.current = [];

    if (!currentEntry) {
      previousEntryRef.current = {
        entryId: null,
        cycleNumber: 0,
        recycleCount: 0
      };
      setCompletionEffectActive(false);
      setDisplayFilledSlots(0);
      return undefined;
    }

    const previous = previousEntryRef.current;
    const recycledIntoNextCycle = Boolean(
      previous.entryId
      && String(previous.entryId) !== String(currentEntry.id)
      && (
        cycleNumber > Number(previous.cycleNumber || 0)
        || recycleCount > Number(previous.recycleCount || 0)
      )
    );

    previousEntryRef.current = {
      entryId: currentEntry.id,
      cycleNumber,
      recycleCount
    };

    if (!recycledIntoNextCycle) {
      setCompletionEffectActive(false);
      setDisplayFilledSlots(actualFilledSlots);
      return undefined;
    }

    setCompletionEffectActive(true);
    setDisplayFilledSlots(MATRIX_SLOTS);

    const showResetTimer = setTimeout(() => {
      setDisplayFilledSlots(actualFilledSlots);
    }, 520);

    const clearEffectTimer = setTimeout(() => {
      setCompletionEffectActive(false);
    }, 980);

    completionTimersRef.current = [showResetTimer, clearEffectTimer];

    return () => {
      clearTimeout(showResetTimer);
      clearTimeout(clearEffectTimer);
    };
  }, [actualFilledSlots, currentEntry, cycleNumber, recycleCount]);

  useEffect(() => () => {
    completionTimersRef.current.forEach((timer) => clearTimeout(timer));
  }, []);

  const progressLabel = `${displayFilledSlots}/${MATRIX_SLOTS}`;
  const matrixSlots = useMemo(
    () => Array.from({ length: MATRIX_SLOTS }, (_, index) => ({
      label: SLOT_LABELS[index],
      filled: index < displayFilledSlots
    })),
    [displayFilledSlots]
  );

  if (autopoolQuery.isError && !autopoolQuery.data) {
    return <ErrorState message="Autopool data could not be loaded." onRetry={autopoolQuery.refetch} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 rounded-[36px] bg-[radial-gradient(circle_at_top,#161922,#0f1115_72%)] p-4 sm:p-5">
      <section className="rounded-[30px] border border-white/8 bg-[#12141a] p-5 shadow-[0_24px_56px_rgba(0,0,0,0.34)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">Global Autopool</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/8 bg-[#1a1d24] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
                Entry {currency(config.entryAmount || 2)}
              </span>
              <span className="rounded-full border border-white/8 bg-[#1a1d24] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
                Matrix {matrixType}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => enterMutation.mutate({ requestId: createRequestId() })}
            disabled={enterMutation.isPending || !canAfford}
            className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#334155]"
          >
            {enterMutation.isPending ? <RefreshCcw size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {enterMutation.isPending ? 'Processing...' : 'Buy Pool'}
          </button>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/8 bg-[#1a1d24] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.34)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">Matrix</p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-white">{matrixType}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">Earnings</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">{currency(earnings)}</p>
          </div>
        </div>

        <div
          className={[
            'mt-6 rounded-[30px] border border-white/10 bg-[rgba(255,255,255,0.05)] p-4 backdrop-blur-xl transition-all duration-500 sm:p-5',
            completionEffectActive
              ? 'ring-2 ring-blue-400/60 shadow-[0_20px_48px_rgba(37,99,235,0.22)]'
              : 'shadow-[0_18px_44px_rgba(0,0,0,0.24)]'
          ].join(' ')}
        >
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {matrixSlots.map((slot) => (
              <MatrixSlot
                key={slot.label}
                filled={slot.filled}
                label={slot.label}
                highlighted={completionEffectActive && slot.filled}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <SummaryTile label="Progress" value={progressLabel} />
          <SummaryTile label="Cycle / Recycles" value={`#${cycleNumber} / ${recycleCount}`} />
        </div>
      </section>
    </div>
  );
}
