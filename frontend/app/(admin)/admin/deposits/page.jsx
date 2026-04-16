'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { FilterBar } from '@/components/admin/FilterBar';
import { SearchInput } from '@/components/admin/SearchInput';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminDeposits, reviewAdminDeposit, syncAdminNowPaymentsDeposit } from '@/lib/services/admin';
import { currency, dateTime } from '@/lib/utils/format';

export default function AdminDepositsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentProvider, setPaymentProvider] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedPayload, setSelectedPayload] = useState(null);
  const queryClient = useQueryClient();

  const depositsQuery = useQuery({
    queryKey: [...queryKeys.adminDeposits, search, status, paymentProvider, paymentStatus, page],
    queryFn: () => getAdminDeposits({ search, status, paymentProvider, paymentStatus, page, limit: 20 })
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, nextStatus, adminNote }) => reviewAdminDeposit(id, { status: nextStatus, adminNote }),
    onSuccess: async (result) => {
      toast.success(result.message || 'Deposit updated');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminDeposits });
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletSummary });
    },
    onError: (error) => toast.error(error.message || 'Failed to update deposit')
  });

  const syncMutation = useMutation({
    mutationFn: (id) => syncAdminNowPaymentsDeposit(id),
    onSuccess: async (result) => {
      toast.success(result.message || 'NOWPayments status refreshed');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminDeposits });
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletSummary });
    },
    onError: (error) => toast.error(error.message || 'Failed to refresh NOWPayments status')
  });

  if (depositsQuery.isLoading) return null;
  if (depositsQuery.isError) return <ErrorState message="Unable to load deposits." onRetry={depositsQuery.refetch} />;

  const envelope = depositsQuery.data || {};
  const rows = Array.isArray(envelope.data) ? envelope.data : [];
  const pagination = envelope.pagination || {};

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Deposit Management" subtitle="Verify crypto deposit requests, review proof, and approve wallet credits once." />

      <FilterBar>
        <div className="w-full max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search by username, email, tx hash, or request id" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={paymentProvider} onChange={(e) => setPaymentProvider(e.target.value)} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
          <option value="all">All Providers</option>
          <option value="manual">Manual</option>
          <option value="nowpayments">NOWPayments</option>
        </select>
        <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
          <option value="all">All Payment Status</option>
          <option value="waiting">Waiting</option>
          <option value="confirming">Confirming</option>
          <option value="confirmed">Confirmed</option>
          <option value="finished">Finished</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="failed">Failed</option>
          <option value="expired">Expired</option>
        </select>
      </FilterBar>

      <DataTable
        columns={[
          { key: 'id', title: 'Request', className: 'col-span-2', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
          { key: 'username', title: 'User', className: 'col-span-2', render: (row) => row.username || '-' },
          { key: 'amount', title: 'Amount', className: 'col-span-1', render: (row) => currency(row.amount) },
          { key: 'asset', title: 'Asset', className: 'col-span-1', render: (row) => row.payment_provider === 'nowpayments' ? 'NOWPayments' : (row.asset || 'USDT') },
          { key: 'network', title: 'Network', className: 'col-span-1', render: (row) => row.network || 'BEP20' },
          { key: 'transaction_reference', title: 'Reference', className: 'col-span-2', render: (row) => row.payment_provider === 'nowpayments' ? (row.payment_id || row.order_id || '-') : (row.transaction_reference || '-') },
          { key: 'wallet_address_snapshot', title: 'Wallet Used', className: 'col-span-2', render: (row) => row.wallet_address_snapshot || '-' },
          { key: 'proof', title: 'Proof', className: 'col-span-1', render: (row) => row.payment_provider === 'nowpayments' ? (row.pay_amount ? `${row.pay_amount} ${String(row.pay_currency || '').toUpperCase()}` : '-') : (row.proof_image_url ? <a href={row.proof_image_url} target="_blank" rel="noreferrer" className="text-xs text-accent underline">View</a> : '-') },
          { key: 'status', title: 'Status', className: 'col-span-1', render: (row) => <StatusBadge status={row.payment_provider === 'nowpayments' ? (row.payment_status || row.status) : row.status} /> },
          { key: 'created_at', title: 'Date', className: 'col-span-2', render: (row) => dateTime(row.created_at) },
          {
            key: 'actions',
            title: 'Action',
            className: 'col-span-2',
            render: (row) => (
              <div className="flex gap-1">
                {row.payment_provider === 'nowpayments' ? (
                  <>
                    <button
                      disabled={syncMutation.isPending}
                      onClick={() => syncMutation.mutate(row.id)}
                      className="rounded-lg bg-sky-600/20 px-2 py-1 text-xs text-sky-300 disabled:opacity-50"
                    >
                      Sync
                    </button>
                    <button
                      onClick={() => setSelectedPayload(row.raw_webhook_data || row.details || {})}
                      className="rounded-lg bg-white/10 px-2 py-1 text-xs text-text"
                    >
                      Payload
                    </button>
                  </>
                ) : null}
                <button
                  disabled={row.payment_provider === 'nowpayments' || row.status !== 'pending' || reviewMutation.isPending}
                  onClick={() => {
                    const adminNote = window.prompt('Admin note (optional)', '') || '';
                    reviewMutation.mutate({ id: row.id, nextStatus: 'approved', adminNote });
                  }}
                  className="rounded-lg bg-emerald-600/20 px-2 py-1 text-xs text-emerald-300 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  disabled={row.payment_provider === 'nowpayments' || row.status !== 'pending' || reviewMutation.isPending}
                  onClick={() => {
                    const adminNote = window.prompt('Rejection reason', '') || '';
                    reviewMutation.mutate({ id: row.id, nextStatus: 'rejected', adminNote });
                  }}
                  className="rounded-lg bg-rose-600/20 px-2 py-1 text-xs text-rose-300 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )
          }
        ]}
        rows={rows}
        empty={<EmptyState title="No deposits found" description="No deposit requests match your current filters." />}
      />

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(pagination.page || 1) <= 1} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Previous</button>
        <button onClick={() => setPage((p) => ((pagination.totalPages || 1) > p ? p + 1 : p))} disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Next</button>
      </div>

      {selectedPayload ? (
        <div className="card-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-text">NOWPayments Payload</h3>
            <button onClick={() => setSelectedPayload(null)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-muted">Close</button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-cardSoft p-3 text-xs text-text">{JSON.stringify(selectedPayload, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
