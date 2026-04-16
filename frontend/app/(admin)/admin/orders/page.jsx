'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { FilterBar } from '@/components/admin/FilterBar';
import { SearchInput } from '@/components/admin/SearchInput';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminOrderDetails, getAdminOrders } from '@/lib/services/admin';
import { currency, number, shortDate } from '@/lib/utils/format';

export default function AdminOrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  const ordersQuery = useQuery({
    queryKey: [...queryKeys.adminOrders, search, status, page],
    queryFn: () => getAdminOrders({ search, status, page, limit: 10 })
  });
  const detailsQuery = useQuery({
    queryKey: queryKeys.adminOrderDetail(selectedOrderId),
    queryFn: () => getAdminOrderDetails(selectedOrderId),
    enabled: Boolean(selectedOrderId)
  });

  if (ordersQuery.isLoading) return null;
  if (ordersQuery.isError) return <ErrorState message="Unable to load orders." onRetry={ordersQuery.refetch} />;

  const envelope = ordersQuery.data || {};
  const orders = Array.isArray(envelope.data) ? envelope.data : [];
  const pagination = envelope.pagination || {};
  const filtered = orders.filter((o) => {
    const text = (String(o.id || '') + ' ' + String(o.status || '')).toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus = status === 'all' ? true : o.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Orders Management" subtitle="Monitor all product orders and statuses" />

      <FilterBar>
        <div className="w-full max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search order id or status" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </FilterBar>

      {!filtered.length ? <EmptyState title="No orders found" description="No order records match the current filter state." /> : null}

      <DataTable
        columns={[
          { key: 'id', title: 'Order', className: 'col-span-3', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
          { key: 'user_id', title: 'User', className: 'col-span-2', render: (row) => row.user_id ? `#${String(row.user_id).slice(0, 8)}` : 'N/A' },
          { key: 'status', title: 'Status', className: 'col-span-2', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'total_amount', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.total_amount) },
          { key: 'total_bv', title: 'BV/PV', className: 'col-span-2', render: (row) => `BV ${number(row.total_bv)} | PV ${number(row.total_pv)}` },
          { key: 'created_at', title: 'Date', className: 'col-span-1', render: (row) => shortDate(row.created_at) },
          { key: 'action', title: 'Action', className: 'col-span-12 md:col-span-12', render: (row) => <button onClick={() => setSelectedOrderId(row.id)} className="rounded-lg bg-white/5 px-2 py-1 text-xs">View</button> }
        ]}
        rows={filtered}
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

      {selectedOrderId ? (
        <div className="card-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Order Details</h3>
            <button onClick={() => setSelectedOrderId('')} className="text-xs text-muted">Close</button>
          </div>
          {detailsQuery.isLoading ? <p className="text-sm text-muted">Loading order detail...</p> : null}
          {detailsQuery.isError ? <ErrorState message="Could not load order details." onRetry={detailsQuery.refetch} /> : null}
          {!detailsQuery.isLoading && !detailsQuery.isError ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-white/5 p-3 text-sm">Order ID: #{String(detailsQuery.data?.data?.id || '').slice(0, 8)}</div>
                <div className="rounded-xl bg-white/5 p-3 text-sm">User: {detailsQuery.data?.data?.user_id ? `#${String(detailsQuery.data.data.user_id).slice(0, 8)}` : 'N/A'}</div>
                <div className="rounded-xl bg-white/5 p-3 text-sm">Amount: {currency(detailsQuery.data?.data?.total_amount)}</div>
                <div className="rounded-xl bg-white/5 p-3 text-sm">Status: {detailsQuery.data?.data?.status || 'N/A'}</div>
              </div>
              <div className="mt-3 rounded-xl border border-white/10 p-3 text-sm text-muted">
                Items: {Array.isArray(detailsQuery.data?.data?.items) ? detailsQuery.data.data.items.length : 0}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
