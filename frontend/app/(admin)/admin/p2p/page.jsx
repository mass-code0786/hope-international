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
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminP2pTransfers } from '@/lib/services/admin';
import { currency, dateTime } from '@/lib/utils/format';

export default function AdminP2pPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const p2pQuery = useQuery({
    queryKey: [...queryKeys.adminP2p, search, page],
    queryFn: () => getAdminP2pTransfers({ search, page, limit: 20 })
  });

  if (p2pQuery.isLoading) return <AdminShellSkeleton />;
  if (p2pQuery.isError) return <ErrorState message="Unable to load p2p transfers." onRetry={p2pQuery.refetch} />;

  const envelope = p2pQuery.data || {};
  const rows = Array.isArray(envelope.data) ? envelope.data : [];
  const pagination = envelope.pagination || {};

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="P2P Transfer Monitoring" subtitle="Track sender, receiver, amount, and status" />

      <FilterBar>
        <div className="w-full max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search by sender, receiver, or user id" /></div>
      </FilterBar>

      <DataTable
        columns={[
          { key: 'id', title: 'Transfer', className: 'col-span-2', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
          { key: 'from_username', title: 'Sender', className: 'col-span-2', render: (row) => row.from_username || '-' },
          { key: 'to_username', title: 'Receiver', className: 'col-span-2', render: (row) => row.to_username || '-' },
          { key: 'amount', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.amount) },
          { key: 'status', title: 'Status', className: 'col-span-2', render: (row) => <StatusBadge status={row.status || 'completed'} /> },
          { key: 'created_at', title: 'Date', className: 'col-span-2', render: (row) => dateTime(row.created_at) }
        ]}
        rows={rows}
        empty={<EmptyState title="No p2p transfers found" description="No transfer records match your current filters." />}
      />

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(pagination.page || 1) <= 1} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Previous</button>
        <button onClick={() => setPage((p) => ((pagination.totalPages || 1) > p ? p + 1 : p))} disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
