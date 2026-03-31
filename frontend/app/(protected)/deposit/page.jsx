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

export default function DepositPage() {
  const formRef = useRef(null);
  const queryClient = useQueryClient();
  const depositsQuery = useQuery({ queryKey: queryKeys.walletDeposits, queryFn: getDepositHistory });

  const depositMutation = useMutation({
    mutationFn: createDepositRequest,
    onSuccess: async (result) => {
      formRef.current?.reset();
      toast.success(result.message || 'USDT deposit submitted successfully');
      await queryClient.invalidateQueries({ queryKey: queryKeys.walletDeposits });
    },
    onError: (error) => toast.error(error.message || 'Deposit request failed')
  });

  const depositsEnvelope = depositsQuery.data || {};
  const deposits = Array.isArray(depositsEnvelope.data) ? depositsEnvelope.data : [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="USDT Deposit"
        subtitle="Submit a BEP20 deposit request. Wallet credit happens only after admin approval."
        action={<Link href="/history/deposit" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">History</Link>}
      />

      <section className="rounded-2xl border border-emerald-200 bg-[linear-gradient(135deg,#f8fffb_0%,#eefbf4_100%)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2">
          <Badge variant="success">USDT</Badge>
          <Badge variant="info">BEP20</Badge>
        </div>
        <h2 className="mt-3 text-base font-semibold text-slate-950">Crypto deposit only</h2>
        <p className="mt-1 text-sm leading-6 text-slate-700">This deposit flow accepts only USDT on the BEP20 network. Submit the transfer amount and the blockchain transaction hash. Valid requests are saved immediately as pending.</p>
      </section>

      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          depositMutation.mutate({
            amount: Number(formData.get('amount') || 0),
            senderWalletAddress: String(formData.get('senderWalletAddress') || ''),
            txHash: String(formData.get('txHash') || ''),
            note: String(formData.get('note') || '')
          });
        }}
        className="space-y-4 rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
      >
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Asset</p>
            <p className="mt-1 font-semibold text-slate-950">USDT</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Network</p>
            <p className="mt-1 font-semibold text-slate-950">BEP20</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="deposit-amount" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Amount (USDT)</label>
          <input
            id="deposit-amount"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            placeholder="Enter USDT amount"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="deposit-sender-wallet" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Sender Wallet Address</label>
          <input
            id="deposit-sender-wallet"
            name="senderWalletAddress"
            placeholder="Optional BEP20 wallet address"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="deposit-tx-hash" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Transaction Hash</label>
          <input
            id="deposit-tx-hash"
            name="txHash"
            placeholder="Paste the BEP20 transaction hash"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="deposit-note" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Note</label>
          <textarea
            id="deposit-note"
            name="note"
            rows={3}
            placeholder="Optional note for admin review"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <p className="text-xs font-medium leading-5 text-slate-700">Every submission either saves as pending or returns a clear error. There is no silent failure path.</p>
        <button disabled={depositMutation.isPending} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {depositMutation.isPending ? 'Submitting USDT deposit...' : 'Submit USDT Deposit'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600">Latest USDT BEP20 Requests</div>
        {depositsQuery.isError ? (
          <div className="p-3"><ErrorState message="Deposit history could not be loaded." onRetry={depositsQuery.refetch} /></div>
        ) : !deposits.length ? (
          <div className="p-3"><EmptyState title="No deposits yet" description="Your submitted USDT BEP20 deposits will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {deposits.slice(0, 10).map((item) => (
              <div key={item.id} className="space-y-1 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{currency(item.amount)}</p>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </div>
                <p className="text-[11px] font-medium text-slate-600">{item.asset || 'USDT'} • {item.network || 'BEP20'} • {dateTime(item.created_at)}</p>
                {item.transaction_reference ? <p className="text-[11px] text-slate-700">TX: {item.transaction_reference}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
