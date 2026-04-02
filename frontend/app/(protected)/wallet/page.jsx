'use client';

import Link from 'next/link';
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
import { bindWalletAddress, getBtctStakingSummary, getWallet, startBtctStaking } from '@/lib/services/walletService';
import { currency, dateTime, incomeSourceLabel, number, statusVariant } from '@/lib/utils/format';

export default function WalletPage() {
  const queryClient = useQueryClient();
  const walletQuery = useQuery({ queryKey: queryKeys.wallet, queryFn: getWallet });
  const stakingQuery = useQuery({ queryKey: queryKeys.walletStaking, queryFn: getBtctStakingSummary });

  const bindMutation = useMutation({
    mutationFn: bindWalletAddress,
    onSuccess: async () => {
      toast.success('Wallet address saved');
      await queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
    },
    onError: (error) => toast.error(error.message || 'Failed to save wallet address')
  });

  const startStakingMutation = useMutation({
    mutationFn: startBtctStaking,
    onSuccess: async (result) => {
      toast.success(result.message || 'BTCT staking started');
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
  const walletBinding = data.walletBinding || null;
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const btctTransactions = Array.isArray(data.btctTransactions) ? data.btctTransactions : [];
  const staking = stakingQuery.data?.data || {};
  const stakingPlan = staking.plan || null;
  const stakingPayouts = Array.isArray(staking.payouts) ? staking.payouts : [];
  const eligibility = staking.eligibility || {};

  const withdrawalBalance = Number(wallet.withdrawal_wallet_balance ?? wallet.withdrawal_balance ?? 0);
  const btctAvailable = Number(wallet.btct_available_wallet_balance ?? wallet.btct_available_balance ?? wallet.btct_balance ?? 0);
  const btctLocked = Number(wallet.btct_locked_wallet_balance ?? wallet.btct_locked_balance ?? 0);

  return (
    <div className="space-y-3">
      <SectionHeader title="Wallet Overview" subtitle="Cash balances, BTCT rewards, staking status, wallet binding, and recent finance activity" />

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard compact title="Available Balance" value={currency(wallet.balance || 0)} emphasis="primary" right={<WalletIcon size={18} className="text-accent" />} />
        <StatCard compact title="Withdrawal Wallet" value={currency(withdrawalBalance)} subtitle="Receives BTCT staking payouts" right={<HandCoins size={18} className="text-accent" />} />
        <StatCard compact title="BTCT Available" value={`${number(btctAvailable)} BTCT`} subtitle={`Locked ${number(btctLocked)} BTCT`} right={<BtctCoinLogo size={18} className="shrink-0" />} />
        <StatCard compact title="Recent Transactions" value={transactions.length} subtitle="Latest cash entries" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BtctCoinLogo size={18} className="shrink-0" />
              <p className="text-sm font-semibold text-slate-900">BTCT Staking</p>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Stake 15,000 BTCT internally and receive $15 in your Withdrawal Wallet every 10 days.</p>
          </div>
          <Badge variant={stakingPlan ? 'success' : eligibility.isEligible ? 'warning' : 'default'}>{stakingPlan ? 'Active' : eligibility.isEligible ? 'Eligible' : 'Not Eligible'}</Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <BtctCoinLogo size={14} className="shrink-0" />
              <p>BTCT Available</p>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{number(btctAvailable)} BTCT</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <BtctCoinLogo size={14} className="shrink-0" />
              <p>Locked BTCT</p>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-900">{number(btctLocked)} BTCT</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">Payout Rule</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">$15 every 10 days</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] text-slate-500">Next Payout</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{stakingPlan?.next_payout_at ? dateTime(stakingPlan.next_payout_at) : 'Not scheduled'}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => startStakingMutation.mutate()}
            disabled={startStakingMutation.isPending || !eligibility.isEligible || Boolean(stakingPlan)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <LockKeyhole size={15} />
            {startStakingMutation.isPending ? 'Starting...' : 'Start Staking'}
          </button>
          {!eligibility.isEligible && !stakingPlan ? <p className="text-[11px] text-rose-600">You need at least 15,000 BTCT available to start staking.</p> : null}
          {stakingPlan ? <p className="text-[11px] text-emerald-700">Staking started on {dateTime(stakingPlan.started_at)} with {number(stakingPlan.staking_amount_btct)} BTCT locked.</p> : null}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-800">Staking Payout History</p>
            <span className="text-[11px] text-slate-500">Credited to Withdrawal Wallet</span>
          </div>
          {!stakingPayouts.length ? (
            <div className="pt-3"><EmptyState title="No staking payouts yet" description="Your 10-day BTCT staking payouts will appear here after the payout engine runs." /></div>
          ) : (
            <div className="mt-3 divide-y divide-slate-200">
              {stakingPayouts.slice(0, 6).map((item) => (
                <div key={item.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900">Cycle #{item.cycle_number}</p>
                    <p className="text-xs font-semibold text-emerald-700">+ {currency(item.payout_amount_usd)}</p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">{dateTime(item.payout_date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-xs font-semibold text-slate-800">Bind / Manage Wallet Address</p>
        <p className="mt-1 text-[11px] text-slate-500">Set the address used for withdrawal requests.</p>

        <form
          className="mt-2 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            bindMutation.mutate({
              walletAddress: String(formData.get('walletAddress') || ''),
              network: String(formData.get('network') || '')
            });
          }}
        >
          <input name="walletAddress" defaultValue={walletBinding?.wallet_address || ''} placeholder="Wallet address" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs" required />
          <input name="network" defaultValue={walletBinding?.network || ''} placeholder="Network (TRC20 / BEP20 / ERC20)" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs" />
          <button type="submit" disabled={bindMutation.isPending} className="rounded-lg bg-[#0ea5e9] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
            {bindMutation.isPending ? 'Saving...' : 'Save Wallet'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/deposit" className="rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-semibold text-slate-700">Deposit</Link>
        <Link href="/withdraw" className="rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-semibold text-slate-700">Withdraw</Link>
        <Link href="/p2p" className="rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-semibold text-slate-700">P2P Transfer</Link>
        <Link href="/history/income" className="rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-semibold text-slate-700">Transaction History</Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2 text-[11px] text-slate-500">Recent Wallet Activity</div>
        {!transactions.length ? (
          <div className="p-3"><EmptyState title="No transactions yet" description="Wallet ledger entries will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800">{incomeSourceLabel(tx.source || 'transaction')}</p>
                  <Badge variant={statusVariant(tx.metadata?.status || (tx.tx_type === 'credit' ? 'approved' : 'pending'))}>{tx.metadata?.status || tx.tx_type}</Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">{dateTime(tx.created_at)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-900">{tx.tx_type === 'credit' ? '+' : '-'} {currency(tx.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-[11px] text-slate-500">
          <BtctCoinLogo size={14} className="shrink-0" />
          <span>BTCT Reward Ledger</span>
        </div>
        {!btctTransactions.length ? (
          <div className="p-3"><EmptyState title="No BTCT rewards yet" description="Auction loss compensation and BTCT staking records will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {btctTransactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800">{incomeSourceLabel(tx.source || 'btct_transaction')}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                    <BtctCoinLogo size={12} className="shrink-0" />
                    <span>BTCT</span>
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">{dateTime(tx.created_at)}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900"><BtctCoinLogo size={14} className="shrink-0" />+ {number(tx.amount)} BTCT</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
