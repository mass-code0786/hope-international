'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { RefreshCcw, ShoppingCart } from 'lucide-react';
import { AutopoolHistoryModal } from '@/components/autopool/AutopoolHistoryModal';
import { IncomeCard } from '@/components/autopool/IncomeCard';
import { AutopoolPurchaseModal } from '@/components/autopool/AutopoolPurchaseModal';
import { ErrorState } from '@/components/ui/ErrorState';
import { queryKeys } from '@/lib/query/queryKeys';
import { enterAutopool, getAutopoolDashboard } from '@/lib/services/autopoolService';
import { getWallet } from '@/lib/services/walletService';
import { currency } from '@/lib/utils/format';

const MATRIX_SLOTS = 3;
const SLOT_LABELS = ['LEFT', 'MIDDLE', 'RIGHT'];
const DEFAULT_PACKAGE_AMOUNTS = [2, 99, 313, 786];

function createRequestId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return null;
}

function clampFilledSlots(value) {
  return Math.max(0, Math.min(MATRIX_SLOTS, Number(value || 0)));
}

function buildMatrixSlots(filledSlots) {
  const safeFilledSlots = clampFilledSlots(filledSlots);
  return Array.from({ length: MATRIX_SLOTS }, (_, index) => ({
    label: SLOT_LABELS[index],
    filled: index < safeFilledSlots
  }));
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

function AutopoolCard({
  amount,
  earningsValue,
  currentEntry,
  currentFillCount,
  onBuy,
  isPending = false,
  disabled = false,
  myEntry,
  recycleCount
}) {
  const completionTimersRef = useRef([]);
  const previousEntryRef = useRef({
    entryId: null,
    cycleNumber: 0,
    entryRecycleCount: 0
  });

  const [displayFilledSlots, setDisplayFilledSlots] = useState(clampFilledSlots(currentFillCount));
  const [completionEffectActive, setCompletionEffectActive] = useState(false);

  const actualFilledSlots = clampFilledSlots(currentEntry?.filledSlotsCount ?? currentFillCount ?? 0);
  const cycleNumber = Number(currentEntry?.cycleNumber || 0);
  const entryRecycleCount = Number(currentEntry?.recycleCount || 0);
  const currentEntryId = currentEntry?.id || null;

  useEffect(() => {
    completionTimersRef.current.forEach((timer) => clearTimeout(timer));
    completionTimersRef.current = [];

    if (!currentEntryId) {
      previousEntryRef.current = {
        entryId: null,
        cycleNumber: 0,
        entryRecycleCount: 0
      };
      setCompletionEffectActive(false);
      setDisplayFilledSlots(actualFilledSlots);
      return undefined;
    }

    const previous = previousEntryRef.current;
    const recycledIntoNextCycle = Boolean(
      previous.entryId
      && String(previous.entryId) !== String(currentEntryId)
      && (
        cycleNumber > Number(previous.cycleNumber || 0)
        || entryRecycleCount > Number(previous.entryRecycleCount || 0)
      )
    );

    previousEntryRef.current = {
      entryId: currentEntryId,
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
  }, [actualFilledSlots, currentEntryId, cycleNumber, entryRecycleCount]);

  useEffect(() => () => {
    completionTimersRef.current.forEach((timer) => clearTimeout(timer));
  }, []);

  const matrixSlots = useMemo(
    () => buildMatrixSlots(displayFilledSlots),
    [displayFilledSlots]
  );

  return (
    <section className="rounded-[30px] border border-white/8 bg-[#1a1d24] p-5 shadow-[0_24px_56px_rgba(0,0,0,0.38)] sm:p-6">
      <div className="mt-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">Earnings</p>
          <p className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-white sm:text-[34px]">{currency(earningsValue)}</p>
        </div>
      </div>

      <div
        className={[
          'mt-5 rounded-[26px] border border-white/10 bg-[rgba(255,255,255,0.05)] p-4 backdrop-blur-xl transition-all duration-500 sm:mt-6',
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
        onClick={onBuy}
        disabled={disabled}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#2563eb,#1d4ed8)] px-5 py-4 text-base font-semibold text-white shadow-[0_18px_36px_rgba(37,99,235,0.32)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[#334155] disabled:shadow-none"
      >
        {isPending ? <RefreshCcw size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
        <span>{isPending ? 'Processing...' : `Buy Pool ${currency(amount)}`}</span>
      </button>

      <div className="mt-4 flex items-center justify-between gap-4 text-sm">
        <p className="text-[#cbd5e1]">My Entry: {myEntry}</p>
        <div className="flex items-center gap-1.5 font-semibold text-[#86efac]">
          <span aria-hidden="true" className="text-base">{'\u267B\uFE0F'}</span>
          <span>{recycleCount}</span>
        </div>
      </div>
    </section>
  );
}

function buildFallbackPackages(dataPackages = []) {
  const packagesByAmount = new Map(
    (Array.isArray(dataPackages) ? dataPackages : []).map((item) => [Number(item.amount || item.entryAmount || 0), item])
  );

  return DEFAULT_PACKAGE_AMOUNTS.map((amount) => {
    const existing = packagesByAmount.get(amount);
    if (existing) return existing;
    return {
      amount,
      entryAmount: amount,
      earnings: 0,
      myEntry: 0,
      recycleCount: 0,
      currentFillCount: 0,
      currentEntry: null
    };
  });
}

export default function AutopoolPage() {
  const queryClient = useQueryClient();
  const [pendingPackageAmount, setPendingPackageAmount] = useState(null);
  const [historyState, setHistoryState] = useState({ open: false, type: 'total', title: 'Total Income' });
  const [purchaseState, setPurchaseState] = useState({ open: false, amount: null });

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
    onMutate: (variables) => {
      setPendingPackageAmount(Number(variables?.packageAmount || 0));
    },
    onSuccess: async (result, variables) => {
      setPurchaseState({ open: false, amount: null });

      const placement = result.data?.placement || null;
      const packageAmount = Number(variables?.packageAmount || result.data?.packageAmount || 0);

      if (placement?.isRoot) {
        toast.success(`${currency(packageAmount)} autopool entry created`);
      } else if (placement?.slotPosition) {
        toast.success(`${currency(packageAmount)} placed in ${placement.slotLabel || `slot ${placement.slotPosition}`}`);
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
    },
    onSettled: () => {
      setPendingPackageAmount(null);
    }
  });

  const dashboard = autopoolQuery.data?.data || {};
  const walletBalance = Number(walletQuery.data?.wallet?.balance || 0);
  const canAfford = (amount) => (walletQuery.isError ? true : walletBalance >= Number(amount || 0));
  const pendingPurchaseAmount = Number(purchaseState.amount || 0);
  const purchaseModalPending = enterMutation.isPending && pendingPackageAmount === pendingPurchaseAmount;
  const poolCards = useMemo(
    () => buildFallbackPackages(dashboard.packages).sort((left, right) => Number(left.amount || 0) - Number(right.amount || 0)),
    [dashboard.packages]
  );
  const incomeCards = useMemo(() => ([
    { title: 'Total Income', amount: Number(dashboard.totalIncome || dashboard.incomeSummary?.totalIncome || 0), type: 'total' },
    { title: '$2 Pool Income', amount: Number(dashboard.pool2Income || dashboard.incomeSummary?.pool2Income || 0), type: 'pool_2' },
    { title: '$99 Pool Income', amount: Number(dashboard.pool99Income || dashboard.incomeSummary?.pool99Income || 0), type: 'pool_99' },
    { title: '$313 Pool Income', amount: Number(dashboard.pool313Income || dashboard.incomeSummary?.pool313Income || 0), type: 'pool_313' },
    { title: '$786 Pool Income', amount: Number(dashboard.pool786Income || dashboard.incomeSummary?.pool786Income || 0), type: 'pool_786' },
    { title: 'Sponsor Pool Income', amount: Number(dashboard.sponsorPoolIncome || dashboard.incomeSummary?.sponsorPoolIncome || 0), type: 'sponsor_pool' }
  ]), [dashboard]);

  const openPurchaseModal = (amount) => {
    if (enterMutation.isPending) return;
    setPurchaseState({
      open: true,
      amount: Number(amount || 0)
    });
  };

  const closePurchaseModal = () => {
    if (enterMutation.isPending) return;
    setPurchaseState({ open: false, amount: null });
  };

  const confirmPurchase = () => {
    const packageAmount = Number(purchaseState.amount || 0);
    if (!packageAmount || enterMutation.isPending) return;
    enterMutation.mutate({
      packageAmount,
      requestId: createRequestId()
    });
  };

  if (autopoolQuery.isError && !autopoolQuery.data) {
    return <ErrorState message="Autopool data could not be loaded." onRetry={autopoolQuery.refetch} />;
  }

  return (
    <div className="mx-auto max-w-xl rounded-[34px] bg-[linear-gradient(180deg,#12141a,#0f1115)] p-4 pb-28 sm:p-5 sm:pb-12">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-[-0.05em] text-white sm:text-[30px]">Global Autopool</h1>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {incomeCards.map((card) => (
          <IncomeCard
            key={card.type}
            title={card.title}
            amount={card.amount}
            type={card.type}
            onClick={() => setHistoryState({ open: true, type: card.type, title: card.title })}
          />
        ))}
      </div>

      <div className="mt-4 space-y-4 sm:space-y-5">
        {poolCards.map((card) => {
          const amount = Number(card.amount || card.entryAmount || 0);
          const isPending = enterMutation.isPending && pendingPackageAmount === amount;

          return (
            <AutopoolCard
              key={amount}
              amount={amount}
              earningsValue={Number(card.earnings || 0)}
              currentEntry={card.currentEntry}
              currentFillCount={Number(card.currentFillCount || card.currentEntry?.filledSlotsCount || 0)}
              onBuy={() => openPurchaseModal(amount)}
              isPending={isPending}
              disabled={enterMutation.isPending || !canAfford(amount)}
              myEntry={Number(card.myEntry || 0)}
              recycleCount={Number(card.recycleCount || 0)}
            />
          );
        })}
      </div>

      <AutopoolHistoryModal
        open={historyState.open}
        type={historyState.type}
        title={historyState.title}
        onClose={() => setHistoryState((current) => ({ ...current, open: false }))}
      />

      <AutopoolPurchaseModal
        open={purchaseState.open}
        amount={purchaseState.amount}
        isPending={purchaseModalPending}
        onClose={closePurchaseModal}
        onConfirm={confirmPurchase}
      />
    </div>
  );
}
