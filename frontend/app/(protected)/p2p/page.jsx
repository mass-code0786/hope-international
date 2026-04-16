'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { createP2pTransfer, getP2pHistory } from '@/lib/services/walletService';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { queryKeys } from '@/lib/query/queryKeys';
import { currency, dateTime, statusVariant } from '@/lib/utils/format';

export default function P2pPage() {
  const queryClient = useQueryClient();
  const meQuery = useCurrentUser();
  const transfersQuery = useQuery({ queryKey: queryKeys.walletP2p, queryFn: getP2pHistory });

  const transferMutation = useMutation({
    mutationFn: createP2pTransfer,
    onSuccess: async () => {
      toast.success('Transfer completed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.walletP2p })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Transfer failed')
  });

  if (transfersQuery.isError) {
    return <ErrorState message="P2P history could not be loaded." onRetry={transfersQuery.refetch} />;
  }

  const transfers = Array.isArray(transfersQuery.data) ? transfersQuery.data : [];
  const me = meQuery.data || {};

  return (
    <div className="space-y-3">
      <SectionHeader
        title="P2P Transfer"
        subtitle="Transfer wallet funds to another username"
        action={<Link href="/wallet" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">Wallet</Link>}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          transferMutation.mutate({
            toUsername: String(formData.get('toUsername') || '').trim(),
            amount: Number(formData.get('amount') || 0),
            notes: String(formData.get('notes') || '')
          });
        }}
        className="space-y-2 rounded-xl border border-slate-200 bg-white p-3"
      >
        <input name="toUsername" placeholder="Recipient username" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs" required />
        <input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs" required />
        <textarea name="notes" rows={2} placeholder="Notes (optional)" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs" />
        <button disabled={transferMutation.isPending} className="rounded-lg bg-[#0ea5e9] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
          {transferMutation.isPending ? 'Transferring...' : 'Transfer Now'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2 text-[11px] text-slate-500">Recent Transfers</div>
        {!transfers.length ? (
          <div className="p-3"><EmptyState title="No transfers yet" description="Your sent and received P2P transfers will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transfers.slice(0, 20).map((item) => {
              const outgoing = String(item.from_user_id) === String(me.id);
              const routeLabel = outgoing
                ? `${item.to_username || item.to_user_id} (sent)`
                : `${item.from_username || item.from_user_id} (received)`;
              return (
                <div key={item.id} className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">{currency(item.amount)}</p>
                    <Badge variant={statusVariant(item.status)}>{item.status || 'completed'}</Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {routeLabel} - {dateTime(item.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

