'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { FilterBar } from '@/components/admin/FilterBar';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmationModal } from '@/components/admin/ConfirmationModal';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { queryKeys } from '@/lib/query/queryKeys';
import { createManualWalletAdjustment, getAdminWalletSummary, getAdminWalletTransactions } from '@/lib/services/admin';
import { currency, incomeSourceLabel, shortDate } from '@/lib/utils/format';

export default function AdminWalletPage() {
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ userId: '', amount: '', type: 'credit', reason: '' });
  const queryClient = useQueryClient();

  const txQuery = useQuery({
    queryKey: [...queryKeys.adminWalletTransactions, filter, page],
    queryFn: () => getAdminWalletTransactions({ source: filter, page, limit: 15 })
  });
  const summaryQuery = useQuery({
    queryKey: queryKeys.adminWalletSummary,
    queryFn: getAdminWalletSummary
  });

  const adjustMutation = useMutation({
    mutationFn: () => createManualWalletAdjustment({ ...adjustForm, amount: Number(adjustForm.amount || 0) }),
    onSuccess: async (result) => {
      toast.success(result.message || 'Wallet adjustment posted');
      setConfirmOpen(false);
      setAdjustOpen(false);
      setAdjustForm({ userId: '', amount: '', type: 'credit', reason: '' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminWallet });
    },
    onError: (err) => toast.error(err.message || 'Adjustment failed')
  });

  if (txQuery.isLoading || summaryQuery.isLoading) return <AdminShellSkeleton />;
  if (txQuery.isError) return <ErrorState message="Unable to load wallet ledger." onRetry={txQuery.refetch} />;
  if (summaryQuery.isError) return <ErrorState message="Unable to load wallet summary." onRetry={summaryQuery.refetch} />;

  const txEnvelope = txQuery.data || {};
  const txs = Array.isArray(txEnvelope.data) ? txEnvelope.data : [];
  const pagination = txEnvelope.pagination || {};
  const summary = summaryQuery.data?.data || {};

  return (
    <div className="space-y-5">
      <AdminSectionHeader
        title="Wallet Operations"
        subtitle="Ledger visibility and secure manual adjustments"
        action={
          <button onClick={() => setAdjustOpen(true)} className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black">
            Manual Adjustment
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-surface p-4 text-sm">Total credits: <span className="font-semibold text-text">{currency(summary.total_credits)}</span></div>
        <div className="card-surface p-4 text-sm">Total debits: <span className="font-semibold text-text">{currency(summary.total_debits)}</span></div>
        <div className="card-surface p-4 text-sm">Direct + Matching: <span className="font-semibold text-text">{currency(Number(summary.total_direct || 0) + Number(summary.total_matching || 0))}</span></div>
      </div>

      <FilterBar>
        {['all', 'direct_income', 'matching_income', 'reward_qualification', 'cap_overflow', 'manual_adjustment'].map((source) => (
          <button key={source} onClick={() => setFilter(source)} className={`rounded-full px-3 py-2 text-xs ${filter === source ? 'bg-accent text-black' : 'bg-white/5 text-muted'}`}>
            {source === 'all' ? 'All' : incomeSourceLabel(source)}
          </button>
        ))}
      </FilterBar>

      <DataTable
        columns={[
          { key: 'user_id', title: 'User', className: 'col-span-2', render: (row) => row.user_id ? `#${String(row.user_id).slice(0, 8)}` : 'N/A' },
          { key: 'source', title: 'Source', className: 'col-span-3', render: (row) => incomeSourceLabel(row.source) },
          { key: 'tx_type', title: 'Type', className: 'col-span-2', render: (row) => <StatusBadge status={row.tx_type} /> },
          { key: 'amount', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.amount) },
          { key: 'created_at', title: 'Date', className: 'col-span-2', render: (row) => shortDate(row.created_at) },
          { key: 'meta', title: 'Meta', className: 'col-span-1', render: (row) => row.metadata?.note || row.metadata?.reason || '-' }
        ]}
        rows={txs}
      />

      {adjustOpen ? (
        <div className="card-surface p-4">
          <h4 className="text-sm font-semibold text-text">Manual Adjustment Form</h4>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input value={adjustForm.userId} onChange={(e) => setAdjustForm((p) => ({ ...p, userId: e.target.value }))} placeholder="User ID" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input value={adjustForm.amount} onChange={(e) => setAdjustForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" type="number" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <select value={adjustForm.type} onChange={(e) => setAdjustForm((p) => ({ ...p, type: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            <input value={adjustForm.reason} onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setAdjustOpen(false)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted">Cancel</button>
            <button onClick={() => setConfirmOpen(true)} className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black">Review & Confirm</button>
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        open={confirmOpen}
        title="Confirm Wallet Adjustment"
        description="This action updates a user wallet and writes to the audit ledger. Proceed only after validation."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => adjustMutation.mutate()}
        loading={adjustMutation.isPending}
        confirmText="Apply Adjustment"
      />

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={(pagination.page || 1) <= 1}
          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setPage((p) => ((pagination.totalPages || 1) > p ? p + 1 : p))}
          disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
