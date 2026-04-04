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
  const btctAvailable = Number(wallet.btct_available_wallet_balance ?? wallet.btct_available_balance ?? wallet.btct_balance ?? 0);
  const btctLocked = Number(wallet.btct_locked_wallet_balance ?? wallet.btct_locked_balance ?? 0);
  const requestedAmount = Number(stakingAmount || 0);
  const blockSize = Number(eligibility.blockSizeBtct || 5000);
  const requestedBlocks = requestedAmount > 0 ? Math.floor(requestedAmount / blockSize) : Number(eligibility.eligibleBlocks || 0);
  const requestedCyclePayout = requestedBlocks * Number(eligibility.payoutUsdPerBlock || 10);

  return (
    <div className="space-y-3">
      <SectionHeader title={formatLabel('Wallet Overview')} />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard compact title={formatLabel('Available Balance')} value={currency(wallet.balance || 0)} emphasis="primary" right={<WalletIcon size={18} className="text-accent" />} uppercaseTitle={false} />
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
            onClick={() => startStakingMutation.mutate(stakingAmount ? { stakingAmountBtct: Number(stakingAmount) } : {})}
            disabled={startStakingMutation.isPending || !eligibility.isEligible || Boolean(stakingPlan)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <LockKeyhole size={15} />
            {startStakingMutation.isPending ? 'Starting...' : 'Start Staking'}
          </button>
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
