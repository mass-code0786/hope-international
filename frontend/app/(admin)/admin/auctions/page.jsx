'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { DataTable } from '@/components/admin/DataTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { getAdminAuctions } from '@/lib/services/admin';
import { queryKeys } from '@/lib/query/queryKeys';

export default function AdminAuctionsPage() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const auctionsQuery = useQuery({
    queryKey: [...queryKeys.adminAuctions, status, search],
    queryFn: () => getAdminAuctions({ status, search, page: 1, limit: 50 })
  });

  if (auctionsQuery.isError) {
    return <ErrorState message="Admin auctions could not be loaded." onRetry={auctionsQuery.refetch} />;
  }

  const envelope = auctionsQuery.data || {};
  const rows = Array.isArray(envelope.data?.items)
    ? envelope.data.items
    : Array.isArray(envelope.data)
      ? envelope.data
      : [];

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Auctions" subtitle="Fixed-entry auctions with hidden capacity, wallet deduction, and multi-winner tie handling." action={<Link href="/admin/auctions/new" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black">New Auction</Link>} />

      <div className="flex flex-wrap gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search auctions or products" className="w-full max-w-sm rounded-2xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
          <option value="all">All</option>
          <option value="live">Live</option>
          <option value="upcoming">Upcoming</option>
          <option value="ended">Ended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {auctionsQuery.isLoading ? <div className="rounded-3xl border border-white/10 bg-card p-6 text-sm text-muted">Loading auctions...</div> : null}

      <DataTable
        columns={[
          { key: 'title', title: 'Auction', className: 'col-span-3' },
          { key: 'product_name', title: 'Product', className: 'col-span-2', render: (row) => row.product_name || '-' },
          { key: 'entry_price', title: 'Entry', className: 'col-span-1', render: (row) => `$${Number(row.entry_price || 0).toFixed(2)}` },
          { key: 'total_entries', title: 'Entries', className: 'col-span-1', render: (row) => Number(row.total_entries || 0) },
          { key: 'computed_status', title: 'Status', className: 'col-span-1', render: (row) => <StatusBadge status={row.computed_status || row.status} /> },
          { key: 'winner_count', title: 'Winners', className: 'col-span-1', render: (row) => Number(row.winner_count || 0) },
          { key: 'action', title: 'Action', className: 'col-span-1', render: (row) => <Link href={`/admin/auctions/${row.id}`} className="rounded-lg bg-white/5 px-2 py-1 text-xs">Open</Link> }
        ]}
        rows={rows}
      />
    </div>
  );
}
