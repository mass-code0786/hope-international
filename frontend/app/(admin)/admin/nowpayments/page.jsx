'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { getAdminNowPaymentsDeposits, syncAdminNowPaymentsDeposit } from '@/lib/services/admin';
import { useAuthStore } from '@/lib/store/authStore';
import { canAccessSuperAdminArea } from '@/lib/constants/access';
import { currency, dateTime } from '@/lib/utils/format';

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-cardSoft p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-text">{value}</p>
    </div>
  );
}

export default function AdminNowPaymentsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const superAdmin = canAccessSuperAdminArea(user);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const queryClient = useQueryClient();

  const nowPaymentsQuery = useQuery({
    queryKey: [...queryKeys.adminNowPayments, search, paymentStatus, page],
    queryFn: () => getAdminNowPaymentsDeposits({ search, paymentStatus, page, limit: 20 }),
    enabled: superAdmin
  });

  const syncMutation = useMutation({
    mutationFn: (depositId) => syncAdminNowPaymentsDeposit(depositId),
    onSuccess: async (result) => {
      toast.success(result.message || 'NOWPayments status refreshed');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminNowPayments });
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminDeposits });
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletSummary });
    },
    onError: (error) => toast.error(error.message || 'Failed to refresh NOWPayments status')
  });

  const envelope = nowPaymentsQuery.data || {};
  const rows = Array.isArray(envelope.data) ? envelope.data : [];
  const pagination = envelope.pagination || {};
  const summary = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((item) => ['waiting', 'confirming', 'partially_paid'].includes(String(item.payment_status || '').toLowerCase())).length,
    completed: rows.filter((item) => ['confirmed', 'finished'].includes(String(item.payment_status || '').toLowerCase())).length,
    failed: rows.filter((item) => ['failed', 'expired'].includes(String(item.payment_status || '').toLowerCase())).length
  }), [rows]);

  useEffect(() => {
    if (user && !superAdmin) {
      router.replace('/admin');
    }
  }, [router, superAdmin, user]);

  if (!user) return null;
  if (!superAdmin) return null;

  if (nowPaymentsQuery.isLoading) return null;
  if (nowPaymentsQuery.isError) {
    return <ErrorState message="Unable to load NOWPayments deposits." onRetry={nowPaymentsQuery.refetch} />;
  }

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="NOWPayments" subtitle="Super-admin reconciliation for automatic USDT BSC/BEP20 deposits." />

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Visible Records" value={summary.total} />
        <SummaryCard label="Pending" value={summary.pending} />
        <SummaryCard label="Completed" value={summary.completed} />
        <SummaryCard label="Failed / Expired" value={summary.failed} />
      </div>

      <FilterBar>
        <div className="w-full max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search by user, email, provider payment id, or deposit id" /></div>
        <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
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
          { key: 'id', title: 'Payment', className: 'col-span-2', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
          { key: 'username', title: 'User', className: 'col-span-2', render: (row) => row.username || '-' },
          { key: 'requested_amount', title: 'Requested', className: 'col-span-1', render: (row) => currency(row.requested_amount || 0) },
          { key: 'pay_currency', title: 'Coin', className: 'col-span-1', render: () => 'USDT' },
          { key: 'network', title: 'Network', className: 'col-span-1', render: (row) => row.network || 'BSC/BEP20' },
          { key: 'provider_payment_id', title: 'Provider Ref', className: 'col-span-2', render: (row) => row.provider_payment_id || '-' },
          { key: 'wallet_credit', title: 'Wallet Credit', className: 'col-span-1', render: (row) => <StatusBadge status={row.is_credited ? 'completed' : 'pending'} /> },
          { key: 'payment_status', title: 'Payment Status', className: 'col-span-1', render: (row) => <StatusBadge status={row.payment_status || 'waiting'} /> },
          { key: 'created_at', title: 'Created', className: 'col-span-2', render: (row) => dateTime(row.created_at) },
          {
            key: 'actions',
            title: 'Action',
            className: 'col-span-2',
            render: (row) => (
              <div className="flex gap-1">
                <button
                  disabled={syncMutation.isPending}
                  onClick={() => syncMutation.mutate(row.deposit_id)}
                  className="rounded-lg bg-sky-600/20 px-2 py-1 text-xs text-sky-300 disabled:opacity-50"
                >
                  Sync
                </button>
                <button
                  onClick={() => setSelectedPayment(row)}
                  className="rounded-lg bg-white/10 px-2 py-1 text-xs text-text"
                >
                  Inspect
                </button>
              </div>
            )
          }
        ]}
        rows={rows}
        empty={<EmptyState title="No NOWPayments deposits found" description="No automatic deposit records match your current filters." />}
      />

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={(pagination.page || 1) <= 1} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Previous</button>
        <button onClick={() => setPage((current) => ((pagination.totalPages || 1) > current ? current + 1 : current))} disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Next</button>
      </div>

      {selectedPayment ? (
        <div className="card-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-text">NOWPayments Deposit Detail</h3>
            <button onClick={() => setSelectedPayment(null)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-muted">Close</button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-cardSoft p-4 text-sm text-text">
              <p><strong>User:</strong> {selectedPayment.username || '-'}</p>
              <p className="mt-2"><strong>Email:</strong> {selectedPayment.email || '-'}</p>
              <p className="mt-2"><strong>Deposit ID:</strong> {selectedPayment.deposit_id || '-'}</p>
              <p className="mt-2"><strong>Wallet credit:</strong> {selectedPayment.is_credited ? `Credited at ${dateTime(selectedPayment.credited_at)}` : 'Not credited yet'}</p>
              <p className="mt-2"><strong>Payment address:</strong> {selectedPayment.payment_address || selectedPayment.pay_address || '-'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-cardSoft p-4 text-sm text-text">
              <p><strong>Requested:</strong> {currency(selectedPayment.requested_amount || 0)}</p>
              <p className="mt-2"><strong>Expected:</strong> {selectedPayment.expected_amount ? `${selectedPayment.expected_amount} USDT` : '-'}</p>
              <p className="mt-2"><strong>Actually paid:</strong> {selectedPayment.actually_paid ? `${selectedPayment.actually_paid} USDT` : '0 USDT'}</p>
              <p className="mt-2"><strong>Payment status:</strong> {selectedPayment.payment_status || '-'}</p>
              <p className="mt-2"><strong>Updated:</strong> {selectedPayment.updated_at ? dateTime(selectedPayment.updated_at) : '-'}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-cardSoft p-4">
              <p className="text-sm font-semibold text-text">Status History</p>
              <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-card p-3 text-xs text-text">{JSON.stringify(selectedPayment.status_history || [], null, 2)}</pre>
            </div>
            <div className="rounded-2xl border border-white/10 bg-cardSoft p-4">
              <p className="text-sm font-semibold text-text">Raw Webhook Payload</p>
              <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-card p-3 text-xs text-text">{JSON.stringify(selectedPayment.raw_payload || {}, null, 2)}</pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
