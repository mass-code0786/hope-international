'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowRightLeft, HandCoins, LockKeyhole, Wallet as WalletIcon } from 'lucide-react';
import { DepositSuccessCelebration, hasSeenDepositSuccess, isDepositSuccessStatus, markDepositSuccessSeen } from '@/components/payments/DepositSuccessCelebration';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import BtctCoinLogo from '@/components/common/BtctCoinLogo';
import { queryKeys } from '@/lib/query/queryKeys';
import { createWalletTransfer, getBtctStakingSummary, getDepositHistory, getWallet, startBtctStaking } from '@/lib/services/walletService';
import { currency, dateTime, formatLabel, number } from '@/lib/utils/format';

const walletChoices = [
  { value: 'deposit_wallet', label: 'Deposit Wallet' },
  { value: 'income_wallet', label: 'Income Wallet' },
  { value: 'bonus_wallet', label: 'Bonus Wallet' }
];

const transferTargetsBySource = {
  income_wallet: ['deposit_wallet']
};

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [stakingAmount, setStakingAmount] = useState('');
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);
  const [celebrationDeposit, setCelebrationDeposit] = useState(null);
  const [transferForm, setTransferForm] = useState({
    fromWallet: 'income_wallet',
    toWallet: 'deposit_wallet',
    amount: ''
  });
  const walletQuery = useQuery({ queryKey: queryKeys.wallet, queryFn: getWallet, placeholderData: (previousData) => previousData });
  const stakingQuery = useQuery({ queryKey: queryKeys.walletStaking, queryFn: getBtctStakingSummary, placeholderData: (previousData) => previousData });
  const depositsQuery = useQuery({
    queryKey: queryKeys.walletDeposits,
    queryFn: getDepositHistory,
    refetchInterval: (query) => {
      const rows = Array.isArray(query.state.data?.data) ? query.state.data.data : [];
      const hasPending = rows.some((item) => {
        const status = String(item?.payment_status || '').trim().toLowerCase();
        return !isDepositSuccessStatus(status) && !['failed', 'expired'].includes(status);
      });
      return hasPending ? 10000 : false;
    },
    placeholderData: (previousData) => previousData
  });

  const startStakingMutation = useMutation({
    mutationFn: (payload) => startBtctStaking(payload),
    onSuccess: async (result) => {
      toast.success(result.message || 'BTCT staking started');
      setStakingAmount('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.walletStaking })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Unable to start BTCT staking')
  });

  const transferMutation = useMutation({
    mutationFn: (payload) => createWalletTransfer(payload),
    onSuccess: async (result) => {
      toast.success(result.message || 'Transfer successful');
      setTransferForm((current) => ({
        ...current,
        amount: ''
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.walletHubHistory('all') })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Unable to transfer funds')
  });

  if (walletQuery.isError && !walletQuery.data) return <ErrorState message="Wallet data could not be loaded." onRetry={walletQuery.refetch} />;
  if (stakingQuery.isError && !stakingQuery.data) return <ErrorState message="BTCT staking data could not be loaded." onRetry={stakingQuery.refetch} />;

  const data = walletQuery.data || {};
  const depositRows = useMemo(() => (Array.isArray(depositsQuery.data?.data) ? depositsQuery.data.data : []), [depositsQuery.data]);
  const wallet = data.wallet || {};
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const staking = stakingQuery.data?.data || {};
  const stakingPlan = staking.plan || null;
  const stakingPayouts = Array.isArray(staking.payouts) ? staking.payouts : [];
  const eligibility = staking.eligibility || {};

  const incomeBalance = Number(wallet.income_wallet_balance ?? wallet.income_balance ?? 0);
  const depositBalance = Number(wallet.deposit_wallet_balance ?? wallet.deposit_balance ?? 0);
  const bonusBalance = Number(wallet.bonus_wallet_balance ?? wallet.bonus_balance ?? wallet.auction_bonus_wallet_balance ?? wallet.auction_bonus_balance ?? 0);
  const auctionSpendableBalance = Number(wallet.auction_spendable_wallet_balance ?? wallet.auction_spendable_balance ?? ((wallet.balance || 0) + bonusBalance));
  const btctAvailable = Number(wallet.btct_available_wallet_balance ?? wallet.btct_available_balance ?? wallet.btct_balance ?? 0);
  const btctLocked = Number(wallet.btct_locked_wallet_balance ?? wallet.btct_locked_balance ?? 0);
  const balancesByWallet = {
    deposit_wallet: depositBalance,
    income_wallet: incomeBalance,
    bonus_wallet: bonusBalance
  };
  const availableTransferTargets = transferTargetsBySource[transferForm.fromWallet] || [];
  const selectedFromWalletBalance = Number(balancesByWallet[transferForm.fromWallet] || 0);
  const selectedTransferAmount = Number(transferForm.amount || 0);
  const transferValidationError = !transferForm.fromWallet || !transferForm.toWallet
    ? 'Select both wallets'
    : transferForm.fromWallet === transferForm.toWallet
      ? 'Choose different wallets'
      : !availableTransferTargets.includes(transferForm.toWallet)
        ? 'This transfer path is not allowed'
        : !transferForm.amount
          ? ''
          : !Number.isFinite(selectedTransferAmount) || selectedTransferAmount <= 0
            ? 'Enter a valid amount'
            : selectedTransferAmount < 5
              ? 'Minimum transfer amount is $5.00'
              : selectedTransferAmount > selectedFromWalletBalance
                ? 'Insufficient balance'
                : '';
  const requestedAmount = Number(stakingAmount || 0);
  const blockSize = Number(eligibility.blockSizeBtct || 5000);
  const minimumBtct = Number(eligibility.minimumBtct || blockSize || 5000);
  const requestedBlocks = requestedAmount > 0 ? Math.floor(requestedAmount / blockSize) : Number(eligibility.eligibleBlocks || 0);
  const requestedCyclePayout = requestedBlocks * Number(eligibility.payoutUsdPerBlock || 10);
  const canSubmitStaking = !startStakingMutation.isPending && !stakingPlan;
  const stakingRuleLabel = `Minimum ${number(minimumBtct)} BTCT required in ${number(blockSize)} BTCT blocks`;

  function getStakingValidationError() {
    if (stakingPlan) return 'BTCT staking is already active';
    if (btctAvailable < minimumBtct) return `Minimum ${number(minimumBtct)} BTCT required`;
    if (!stakingAmount) return '';
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) return 'Enter a valid BTCT staking amount';
    if (requestedAmount < minimumBtct) return `Minimum ${number(minimumBtct)} BTCT required`;
    if (requestedAmount % blockSize !== 0) return `Stake amount must be in ${number(blockSize)} BTCT blocks`;
    if (requestedAmount > btctAvailable) return 'Insufficient BTCT available for staking';
    return '';
  }

  const stakingValidationError = getStakingValidationError();

  useEffect(() => {
    const nextCelebrationDeposit = depositRows.find((item) => {
      const successId = item?.payment_record_id || item?.id;
      return successId && isDepositSuccessStatus(item?.payment_status) && !hasSeenDepositSuccess(successId);
    });

    if (!nextCelebrationDeposit) return;

    const successId = nextCelebrationDeposit.payment_record_id || nextCelebrationDeposit.id;
    markDepositSuccessSeen(successId);
    setCelebrationDeposit(nextCelebrationDeposit);
    setShowSuccessCelebration(true);
  }, [depositRows]);

  function handleStartStaking() {
    if (startStakingMutation.isPending) return;

    if (stakingPlan) {
      toast.error('BTCT staking is already active');
      return;
    }

    if (stakingValidationError) {
      toast.error(stakingValidationError);
      return;
    }

    const payload = stakingAmount ? { stakingAmountBtct: requestedAmount } : {};
    startStakingMutation.mutate(payload);
  }

  function handleTransferField(field, value) {
    if (field === 'fromWallet') {
      const nextTargets = transferTargetsBySource[value] || [];
      setTransferForm((current) => ({
        ...current,
        fromWallet: value,
        toWallet: nextTargets.includes(current.toWallet) ? current.toWallet : (nextTargets[0] || '')
      }));
      return;
    }

    setTransferForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleTransferSubmit() {
    if (transferMutation.isPending) return;
    if (transferValidationError) {
      toast.error(transferValidationError);
      return;
    }

    transferMutation.mutate({
      fromWallet: transferForm.fromWallet,
      toWallet: transferForm.toWallet,
      amount: selectedTransferAmount
    });
  }

  return (
    <div className="space-y-3">
      <DepositSuccessCelebration
        open={showSuccessCelebration}
        paymentId={celebrationDeposit?.payment_record_id || celebrationDeposit?.id}
        amount={Number(celebrationDeposit?.amount || 0)}
        walletHref="/wallet"
        onClose={() => {
          setShowSuccessCelebration(false);
          setCelebrationDeposit(null);
        }}
      />

      <SectionHeader title={formatLabel('Wallet Overview')} />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-6">
        <StatCard compact title={formatLabel('Available Balance')} value={currency(wallet.balance || 0)} emphasis="primary" right={<WalletIcon size={18} className="text-accent" />} uppercaseTitle={false} />
        <StatCard compact title={formatLabel('Income Wallet')} value={currency(incomeBalance)} right={<HandCoins size={18} className="text-emerald-500" />} uppercaseTitle={false} />
        <StatCard compact title={formatLabel('Deposit Wallet')} value={currency(depositBalance)} right={<WalletIcon size={18} className="text-sky-500" />} uppercaseTitle={false} />
        <StatCard compact title={formatLabel('Bonus Wallet')} value={currency(bonusBalance)} right={<HandCoins size={18} className="text-amber-500" />} uppercaseTitle={false} />
        <StatCard compact title={formatLabel('BTCT Available')} value={`${number(btctAvailable)} BTCT`} right={<BtctCoinLogo size={18} className="shrink-0" />} uppercaseTitle={false} />
        <StatCard compact title="Recent Transactions" value={transactions.length} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Wallet Transfer</p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <ArrowRightLeft size={18} />
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-500">From Wallet</span>
            <select
              value={transferForm.fromWallet}
              onChange={(event) => handleTransferField('fromWallet', event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
            >
              {Object.keys(transferTargetsBySource).map((walletType) => (
                <option key={walletType} value={walletType}>
                  {walletChoices.find((item) => item.value === walletType)?.label || walletType}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-500">To Wallet</span>
            <select
              value={transferForm.toWallet}
              onChange={(event) => handleTransferField('toWallet', event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
            >
              {availableTransferTargets.map((walletType) => (
                <option key={walletType} value={walletType}>
                  {walletChoices.find((item) => item.value === walletType)?.label || walletType}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-500">Amount</span>
            <input
              value={transferForm.amount}
              onChange={(event) => handleTransferField('amount', event.target.value)}
              type="number"
              min="5"
              step="0.01"
              placeholder="Enter transfer amount"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-medium text-slate-500">Available Balance</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{currency(selectedFromWalletBalance)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleTransferSubmit}
            disabled={transferMutation.isPending || Boolean(transferValidationError)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <ArrowRightLeft size={15} />
            {transferMutation.isPending ? 'Transferring...' : 'Transfer Funds'}
          </button>
          {transferValidationError ? <p className="text-xs text-slate-500">{transferValidationError}</p> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <BtctCoinLogo size={18} className="shrink-0" />
            <p className="text-sm font-semibold text-slate-900">{formatLabel('BTCT Staking')}</p>
          </div>
          <Badge variant={stakingPlan ? 'success' : eligibility.isEligible ? 'warning' : 'default'}>{stakingPlan ? 'Active' : eligibility.isEligible ? 'Eligible' : 'Not Eligible'}</Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <BtctCoinLogo size={14} className="shrink-0" />
              <p>{formatLabel('BTCT Available')}</p>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{number(btctAvailable)} BTCT</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <BtctCoinLogo size={14} className="shrink-0" />
              <p>{formatLabel('Locked BTCT')}</p>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{number(btctLocked)} BTCT</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">{formatLabel('Stake Amount')}</p>
            <input
              value={stakingAmount}
              onChange={(event) => setStakingAmount(event.target.value)}
              placeholder={String(eligibility.autoStakeAmountBtct || eligibility.minimumBtct || 5000)}
              type="number"
              step={blockSize}
              min={eligibility.minimumBtct || 5000}
              disabled={Boolean(stakingPlan)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">{formatLabel('Expected Payout')}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{currency(stakingPlan?.payout_per_cycle_usd ?? (stakingAmount ? requestedCyclePayout : eligibility.autoPayoutPerCycleUsd || 0))}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleStartStaking}
            disabled={!canSubmitStaking}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <LockKeyhole size={15} />
            {startStakingMutation.isPending ? 'Starting...' : 'Start Staking'}
          </button>
          <p className="text-xs text-slate-500">
            {stakingPlan
              ? 'An active BTCT staking plan is already running.'
              : stakingValidationError || stakingRuleLabel}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-800">{formatLabel('Staking Payout History')}</p>
          {!stakingPayouts.length ? (
            <div className="pt-3"><EmptyState title="No staking payouts yet" /></div>
          ) : (
            <div className="mt-3 divide-y divide-slate-200">
              {stakingPayouts.slice(0, 6).map((item) => (
                <div key={item.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900">Cycle #{item.cycle_number} {item.cycle_key ? `(${item.cycle_key})` : ''}</p>
                    <p className="text-xs font-semibold text-emerald-700">+ {currency(item.payout_amount_usd)}</p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">{dateTime(item.payout_date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
