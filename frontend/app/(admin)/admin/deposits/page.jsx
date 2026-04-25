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
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { queryKeys } from '@/lib/query/queryKeys';
import { canAccessSuperAdminArea } from '@/lib/constants/access';
import { useAuthStore } from '@/lib/store/authStore';
import {
  approveAdminDeposit,
  getAdminDeposits,
  rejectAdminDeposit,
  sendAdminFunds
} from '@/lib/services/admin';
import { currency, dateTime } from '@/lib/utils/format';
import { depositStatusLabel, depositStatusMessage } from '@/lib/utils/depositStatus';

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-cardSoft p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-text">{value}</p>
    </div>
  );
}

export default function AdminDepositsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const superAdmin = canAccessSuperAdminArea(user);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [sendForm, setSendForm] = useState({
    username: '',
    amount: '',
    note: ''
  });

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    if (user && !superAdmin) {
      router.replace('/admin');
    }
  }, [router, superAdmin, user]);

  const depositsQuery = useQuery({
    queryKey: [...queryKeys.adminDeposits, search, status, page],
    queryFn: () => getAdminDeposits({ search, status, page, limit: 20 }),
    enabled: superAdmin
  });

  const approveMutation = useMutation({
    mutationFn: (id) => approveAdminDeposit(id),
    onSuccess: async (result) => {
      toast.success(result.message || 'Deposit approved');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminDeposits }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminNowPayments }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletSummary })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Unable to approve deposit')
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => rejectAdminDeposit(id),
    onSuccess: async (result) => {
      toast.success(result.message || 'Deposit rejected');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminDeposits }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminNowPayments })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Unable to reject deposit')
  });

  const sendFundsMutation = useMutation({
    mutationFn: (payload) => sendAdminFunds(payload),
    onSuccess: async (result) => {
      toast.success(result.message || 'Funds sent');
      setSendForm({ username: '', amount: '', note: '' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletSummary }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletTransactions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletUsers })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Unable to send funds')
  });

  const envelope = depositsQuery.data || {};
  const rows = Array.isArray(envelope.data) ? envelope.data : [];
  const pagination = envelope.pagination || {};
  const summary = useMemo(() => ({
    visible: rows.length,
    pending: rows.filter((item) => String(item.status || '').toUpperCase() === 'PENDING').length,
    approved: rows.filter((item) => String(item.status || '').toUpperCase() === 'SUCCESS').length,
    rejected: rows.filter((item) => String(item.status || '').toUpperCase() === 'REJECTED').length
  }), [rows]);

  const sendingDisabled = sendFundsMutation.isPending
    || !sendForm.username.trim()
    || !sendForm.note.trim()
    || !(Number(sendForm.amount) > 0);

  if (!user) return null;
  if (!superAdmin) return null;
  if (depositsQuery.isLoading) return null;
  if (depositsQuery.isError) {
    return <ErrorState message="Unable to load pending deposits." onRetry={depositsQuery.refetch} />;
  }

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Deposits" subtitle="Super-admin approval queue for deposits that did not auto-credit and a manual send-funds control." />

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Visible Records" value={summary.visible} />
        <SummaryCard label="Pending" value={summary.pending} />
        <SummaryCard label="Approved" value={summary.approved} />
        <SummaryCard label="Rejected" value={summary.rejected} />
      </div>

      <FilterBar>
        <div className="w-full max-w-sm">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by user, email, deposit id, or payment reference" />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text"
        >
          <option value="pending">Pending</option>
          <option value="success">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
        </select>
      </FilterBar>

      <DataTable
        columns={[
          {
            key: 'user',
            title: 'User',
            className: 'col-span-3',
            render: (row) => (
              <div>
                <p className="font-semibold text-text">{row.username || '-'}</p>
                <p className="mt-1 text-xs text-muted">{row.email || row.user_id}</p>
              </div>
            )
          },
          { key: 'amount', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.amount || 0) },
          {
            key: 'status',
            title: 'Status',
            className: 'col-span-2',
            render: (row) => (
              <div className="space-y-1">
                <StatusBadge status={depositStatusLabel(row.status)} />
                <p className="text-xs text-muted">{depositStatusMessage(row)}</p>
              </div>
            )
          },
          { key: 'created_at', title: 'Date', className: 'col-span-2', render: (row) => dateTime(row.created_at) },
          {
            key: 'actions',
            title: 'Actions',
            className: 'col-span-3',
            render: (row) => {
              const pending = String(row.status || '').toUpperCase() === 'PENDING';
              return (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!pending || approveMutation.isPending || rejectMutation.isPending}
                    onClick={() => approveMutation.mutate(row.id)}
                    className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={!pending || approveMutation.isPending || rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate(row.id)}
                    className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              );
            }
          }
        ]}
        rows={rows}
        empty={<EmptyState title="No deposits found" description="No deposits match the selected review state." />}
      />

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={(pagination.page || 1) <= 1}
          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setPage((current) => ((pagination.totalPages || 1) > current ? current + 1 : current))}
          disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <section className="card-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text">Send Funds</h3>
            <p className="mt-1 text-xs text-muted">Credit a user deposit wallet and write an admin transfer record plus wallet ledger entry.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Username</span>
            <input
              value={sendForm.username}
              onChange={(event) => setSendForm((current) => ({ ...current, username: event.target.value }))}
              placeholder="Enter username"
              className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text outline-none"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Amount</span>
            <input
              value={sendForm.amount}
              onChange={(event) => setSendForm((current) => ({ ...current, amount: event.target.value }))}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text outline-none"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Note</span>
            <input
              value={sendForm.note}
              onChange={(event) => setSendForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Reason for manual credit"
              className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text outline-none"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            disabled={sendingDisabled}
            onClick={() => sendFundsMutation.mutate({
              username: sendForm.username.trim(),
              amount: Number(sendForm.amount || 0),
              note: sendForm.note.trim()
            })}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {sendFundsMutation.isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </section>
    </div>
  );
}
