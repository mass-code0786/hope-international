'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { createDepositRequest, getDepositHistory } from '@/lib/services/walletService';
import { currency, dateTime, statusVariant } from '@/lib/utils/format';

const methods = [
  { value: 'manual', label: 'Manual' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'bank', label: 'Bank Transfer' }
];

export default function DepositPage() {
  const formRef = useRef(null);
  const queryClient = useQueryClient();
  const depositsQuery = useQuery({ queryKey: queryKeys.walletDeposits, queryFn: getDepositHistory });

  const depositMutation = useMutation({
    mutationFn: createDepositRequest,
    onSuccess: async (result) => {
      formRef.current?.reset();
      toast.success(result.message || 'Deposit request submitted');
      await queryClient.invalidateQueries({ queryKey: queryKeys.walletDeposits });
    },
    onError: (error) => toast.error(error.message || 'Deposit request failed')
  });

  const depositsEnvelope = depositsQuery.data || {};
  const deposits = Array.isArray(depositsEnvelope.data) ? depositsEnvelope.data : [];

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Deposit"
        subtitle="Submit a deposit request and track approval status"
        action={<Link href="/history/deposit" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">History</Link>}
      />

      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          depositMutation.mutate({
            amount: Number(formData.get('amount') || 0),
            method: String(formData.get('method') || 'manual'),
            instructions: String(formData.get('instructions') || ''),
            details: {
              payerName: String(formData.get('payerName') || ''),
              txHash: String(formData.get('txHash') || '')
            }
          });
        }}
        className="space-y-3 rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
      >
        <div className="space-y-1.5">
          <label htmlFor="deposit-amount" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Amount</label>
          <input
            id="deposit-amount"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            placeholder="Amount (min 1)"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-500 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="deposit-method" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Method</label>
          <select
            id="deposit-method"
            name="method"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          >
            {methods.map((method) => (
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="deposit-payer-name" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Payer Name</label>
          <input
            id="deposit-payer-name"
            name="payerName"
            placeholder="Payer name (optional)"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="deposit-tx-hash" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Transaction Reference</label>
          <input
            id="deposit-tx-hash"
            name="txHash"
            placeholder="Transaction hash / reference (optional)"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="deposit-instructions" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Instructions</label>
          <textarea
            id="deposit-instructions"
            name="instructions"
            rows={3}
            placeholder="Instructions or note for admin (optional)"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          />
        </div>
        <p className="text-xs font-medium leading-5 text-slate-600">Deposit requests are stored immediately and credited only after admin approval.</p>
        <button disabled={depositMutation.isPending} className="rounded-lg bg-[#0ea5e9] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
          {depositMutation.isPending ? 'Submitting...' : 'Submit Deposit'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2 text-[11px] text-slate-500">Latest Deposit Requests</div>
        {depositsQuery.isError ? (
          <div className="p-3"><ErrorState message="Deposit history could not be loaded." onRetry={depositsQuery.refetch} /></div>
        ) : !deposits.length ? (
          <div className="p-3"><EmptyState title="No deposits yet" description="Your submitted deposit requests will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {deposits.slice(0, 10).map((item) => (
              <div key={item.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-800">{currency(item.amount)}</p>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500">{item.method || 'manual'} - {dateTime(item.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
