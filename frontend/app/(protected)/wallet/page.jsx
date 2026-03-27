'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { bindWalletAddress, getWallet } from '@/lib/services/walletService';
import { currency, dateTime, statusVariant } from '@/lib/utils/format';

export default function WalletPage() {
  const queryClient = useQueryClient();
  const walletQuery = useQuery({ queryKey: queryKeys.wallet, queryFn: getWallet });

  const bindMutation = useMutation({
    mutationFn: bindWalletAddress,
    onSuccess: async () => {
      toast.success('Wallet address saved');
      await queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
    },
    onError: (error) => toast.error(error.message || 'Failed to save wallet address')
  });

  if (walletQuery.isError) return <ErrorState message="Wallet data could not be loaded." onRetry={walletQuery.refetch} />;

  const data = walletQuery.data || {};
  const wallet = data.wallet || {};
  const walletBinding = data.walletBinding || null;
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];

  return (
    <div className="space-y-3">
      <SectionHeader title="Wallet Overview" subtitle="Balance, wallet binding, and recent finance activity" />

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard compact title="Available Balance" value={currency(wallet.balance || 0)} emphasis="primary" />
        <StatCard compact title="Recent Transactions" value={transactions.length} subtitle="Latest 100 entries" />
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
                  <p className="text-xs font-semibold text-slate-800">{tx.source || 'transaction'}</p>
                  <Badge variant={statusVariant(tx.metadata?.status || (tx.tx_type === 'credit' ? 'approved' : 'pending'))}>{tx.metadata?.status || tx.tx_type}</Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">{dateTime(tx.created_at)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-900">{tx.tx_type === 'credit' ? '+' : '-'} {currency(tx.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

