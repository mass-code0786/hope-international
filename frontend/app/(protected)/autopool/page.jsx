'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { RefreshCcw, ShoppingCart } from 'lucide-react';
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

function MatrixSlot({ filled, label, highlighted }) {
  return (
    <div className="text-center">
      <div
        aria-label={`${label} slot ${filled ? 'filled' : 'empty'}`}
        role="img"
        className={[
          'h-[76px] rounded-[20px] border transition-all duration-300 sm:h-[88px]',
          filled
            ? 'border-[#2563eb] bg-[#2563eb] shadow-[0_18px_40px_rgba(37,99,235,0.34)]'
            : 'border-white/70 bg-[#f5f5f5] shadow-[0_12px_28px_rgba(0,0,0,0.16)]',
          highlighted ? 'scale-[1.04] shadow-[0_22px_48px_rgba(37,99,235,0.34)]' : ''
        ].join(' ')}
      >
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

export default function AutopoolPage() {
  const queryClient = useQueryClient();
  const completionTimersRef = useRef([]);
  const previousEntryRef = useRef({
    entryId: null,
    cycleNumber: 0,
    entryRecycleCount: 0
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
  const entryRecycleCount = Number(currentEntry?.recycleCount || stats.currentRecycleCount || 0);
  const recycleCount = Number(stats.recycle || stats.totalRecycles || stats.completedCycles || 0);
  const purchaseEntries = Number(stats.myEntry || stats.purchaseEntries || 0);
  const earnings = Number(stats.totalEarnings || 0);

  useEffect(() => {
    completionTimersRef.current.forEach((timer) => clearTimeout(timer));
    completionTimersRef.current = [];

    if (!currentEntry) {
      previousEntryRef.current = {
        entryId: null,
        cycleNumber: 0,
        entryRecycleCount: 0
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
        || entryRecycleCount > Number(previous.entryRecycleCount || 0)
      )
    );

    previousEntryRef.current = {
      entryId: currentEntry.id,
      cycleNumber,
      entryRecycleCount
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
  }, [actualFilledSlots, currentEntry, cycleNumber, entryRecycleCount]);

  useEffect(() => () => {
    completionTimersRef.current.forEach((timer) => clearTimeout(timer));
  }, []);

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
    <div className="mx-auto max-w-xl rounded-[34px] bg-[linear-gradient(180deg,#12141a,#0f1115)] p-4 sm:p-5">
      <section className="rounded-[30px] border border-white/8 bg-[#1a1d24] p-5 shadow-[0_24px_56px_rgba(0,0,0,0.38)] sm:p-6">
        <h1 className="text-2xl font-semibold tracking-[-0.05em] text-white sm:text-[30px]">Global Autopool</h1>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">Earnings</p>
            <p className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-white sm:text-[34px]">{currency(earnings)}</p>
          </div>

          <span className="shrink-0 rounded-full border border-white/8 bg-[#12141a] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#cbd5e1]">
            Entry {currency(config.entryAmount || 2)}
          </span>
        </div>

        <div
          className={[
            'mt-5 rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.05)] p-4 backdrop-blur-xl transition-all duration-500',
            completionEffectActive
              ? 'ring-1 ring-blue-400/60 shadow-[0_20px_48px_rgba(37,99,235,0.24)]'
              : 'shadow-[0_18px_40px_rgba(0,0,0,0.26)]'
          ].join(' ')}
        >
          <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-3 sm:max-w-[292px] sm:gap-4">
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

        <button
          type="button"
          onClick={() => enterMutation.mutate({ requestId: createRequestId() })}
          disabled={enterMutation.isPending || !canAfford}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] px-5 py-4 text-base font-semibold text-white shadow-[0_18px_36px_rgba(37,99,235,0.32)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#334155] disabled:shadow-none"
        >
          {enterMutation.isPending ? <RefreshCcw size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
          <span>{enterMutation.isPending ? 'Processing...' : `Buy Pool ${currency(config.entryAmount || 2)}`}</span>
        </button>

        <div className="mt-4 flex items-center justify-between gap-4 text-sm">
          <p className="text-[#cbd5e1]">My Entry: {purchaseEntries}</p>
          <div className="flex items-center gap-1.5 font-semibold text-[#86efac]">
            <span aria-hidden="true" className="text-base">{'\u267B\uFE0F'}</span>
            <span>{recycleCount}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
