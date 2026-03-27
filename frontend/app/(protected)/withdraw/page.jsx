'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { createWithdrawalRequest, getWallet, getWithdrawalHistory } from '@/lib/services/walletService';
import { currency, dateTime, statusVariant } from '@/lib/utils/format';

export default function WithdrawPage() {
  const queryClient = useQueryClient();
  const walletQuery = useQuery({ queryKey: queryKeys.wallet, queryFn: getWallet });
  const withdrawalsQuery = useQuery({ queryKey: queryKeys.walletWithdrawals, queryFn: getWithdrawalHistory });

  const withdrawMutation = useMutation({
    mutationFn: createWithdrawalRequest,
    onSuccess: async () => {
      toast.success('Withdrawal request submitted');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.walletWithdrawals })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Withdrawal request failed')
  });

  if (walletQuery.isError) return <ErrorState message="Wallet details could not be loaded." onRetry={walletQuery.refetch} />;
  if (withdrawalsQuery.isError) return <ErrorState message="Withdrawal history could not be loaded." onRetry={withdrawalsQuery.refetch} />;

  const wallet = walletQuery.data?.wallet || {};
  const walletBinding = walletQuery.data?.walletBinding || null;
  const withdrawals = Array.isArray(withdrawalsQuery.data) ? withdrawalsQuery.data : [];

  return (
    <div className="space-y-3">
      <SectionHeader title="Withdrawal" subtitle={`Available balance: ${currency(wallet.balance || 0)}`} action={<Link href="/history/withdraw" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">History</Link>} />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          withdrawMutation.mutate({
            amount: Number(formData.get('amount') || 0),
            walletAddress: String(formData.get('walletAddress') || ''),
            network: String(formData.get('network') || ''),
            notes: String(formData.get('notes') || '')
          });
        }}
        className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
      >
        <input name="amount" type="number" min="10" step="0.01" placeholder="Amount (min 10)" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs" required />
        <input name="walletAddress" defaultValue={walletBinding?.wallet_address || ''} placeholder="Wallet address" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs" required />
        <input name="network" defaultValue={walletBinding?.network || ''} placeholder="Network" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs" />
        <textarea name="notes" rows={2} placeholder="Notes (optional)" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs" />
        <button disabled={withdrawMutation.isPending} className="rounded-lg bg-[#0ea5e9] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
          {withdrawMutation.isPending ? 'Submitting...' : 'Submit Withdrawal'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2 text-[11px] text-slate-500">Latest Withdrawal Requests</div>
        {!withdrawals.length ? (
          <div className="p-3"><EmptyState title="No withdrawals yet" description="Submitted withdrawal requests will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {withdrawals.slice(0, 10).map((item) => (
              <div key={item.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800">{currency(item.amount)}</p>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">{item.network || 'network'} · {dateTime(item.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

