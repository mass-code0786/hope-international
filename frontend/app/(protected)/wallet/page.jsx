'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HandCoins, LockKeyhole, Wallet as WalletIcon } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import BtctCoinLogo from '@/components/common/BtctCoinLogo';
import { queryKeys } from '@/lib/query/queryKeys';
import { getBtctStakingSummary, getWallet, startBtctStaking } from '@/lib/services/walletService';
import { currency, dateTime, formatLabel, number } from '@/lib/utils/format';

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [stakingAmount, setStakingAmount] = useState('');
  const walletQuery = useQuery({ queryKey: queryKeys.wallet, queryFn: getWallet });
  const stakingQuery = useQuery({ queryKey: queryKeys.walletStaking, queryFn: getBtctStakingSummary });

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

  if (walletQuery.isError) return <ErrorState message="Wallet data could not be loaded." onRetry={walletQuery.refetch} />;
  if (stakingQuery.isError) return <ErrorState message="BTCT staking data could not be loaded." onRetry={stakingQuery.refetch} />;

  const data = walletQuery.data || {};
  const wallet = data.wallet || {};
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const staking = stakingQuery.data?.data || {};
  const stakingPlan = staking.plan || null;
  const stakingPayouts = Array.isArray(staking.payouts) ? staking.payouts : [];
  const eligibility = staking.eligibility || {};

  const withdrawalBalance = Number(wallet.withdrawal_wallet_balance ?? wallet.withdrawal_balance ?? 0);
  const auctionBonusBalance = Number(wallet.auction_bonus_wallet_balance ?? wallet.auction_bonus_balance ?? 0);
  const auctionSpendableBalance = Number(wallet.auction_spendable_wallet_balance ?? wallet.auction_spendable_balance ?? ((wallet.balance || 0) + auctionBonusBalance));
  const btctAvailable = Number(wallet.btct_available_wallet_balance ?? wallet.btct_available_balance ?? wallet.btct_balance ?? 0);
  const btctLocked = Number(wallet.btct_locked_wallet_balance ?? wallet.btct_locked_balance ?? 0);
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

  return (
    <div className="space-y-3">
      <SectionHeader title={formatLabel('Wallet Overview')} />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
        <StatCard compact title={formatLabel('Available Balance')} value={currency(wallet.balance || 0)} emphasis="primary" right={<WalletIcon size={18} className="text-accent" />} uppercaseTitle={false} />
        <StatCard compact title={formatLabel('Auction Bonus')} value={currency(auctionBonusBalance)} right={<HandCoins size={18} className="text-emerald-500" />} uppercaseTitle={false} />
        <StatCard compact title={formatLabel('Auction Spendable')} value={currency(auctionSpendableBalance)} right={<WalletIcon size={18} className="text-violet-500" />} uppercaseTitle={false} />
        <StatCard compact title={formatLabel('Withdrawal Wallet')} value={currency(withdrawalBalance)} right={<HandCoins size={18} className="text-accent" />} uppercaseTitle={false} />
        <StatCard compact title={formatLabel('BTCT Available')} value={`${number(btctAvailable)} BTCT`} right={<BtctCoinLogo size={18} className="shrink-0" />} uppercaseTitle={false} />
        <StatCard compact title="Recent Transactions" value={transactions.length} />
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
