'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inbox, MessageSquare } from 'lucide-react';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { SummaryPanel } from '@/components/admin/SummaryPanel';
import { SearchInput } from '@/components/admin/SearchInput';
import { FilterBar } from '@/components/admin/FilterBar';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminSupportThreads } from '@/lib/services/admin';
import { dateTime } from '@/lib/utils/format';

const categoryOptions = [
  { value: 'all', label: 'All categories' },
  { value: 'order_issue', label: 'Order issue' },
  { value: 'payment_issue', label: 'Payment issue' },
  { value: 'auction_issue', label: 'Auction issue' },
  { value: 'account_issue', label: 'Account issue' },
  { value: 'seller_issue', label: 'Seller issue' },
  { value: 'other', label: 'Other' }
];

const statusTone = {
  open: 'bg-amber-500/10 text-amber-200',
  replied: 'bg-emerald-500/10 text-emerald-200',
  closed: 'bg-white/10 text-muted'
};

export default function AdminSupportPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);

  const supportQuery = useQuery({
    queryKey: [...queryKeys.adminSupport, search, status, category, page],
    queryFn: () => getAdminSupportThreads({ search, status, category, page, limit: 12 })
  });

  if (supportQuery.isLoading) return <AdminShellSkeleton />;
  if (supportQuery.isError) return <ErrorState message="Unable to load the support inbox." onRetry={supportQuery.refetch} />;

  const envelope = supportQuery.data || {};
  const threads = Array.isArray(envelope.data) ? envelope.data : [];
  const summary = envelope.summary || {};
  const pagination = envelope.pagination || {};

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Support Inbox" subtitle="Review user questions, open conversations, and respond from the admin console." />

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryPanel title="Inbox Summary" items={[
          { label: 'Total', value: Number(summary.total_threads || 0) },
          { label: 'Open', value: Number(summary.open_threads || 0) },
          { label: 'Replied', value: Number(summary.replied_threads || 0) },
          { label: 'Closed', value: Number(summary.closed_threads || 0) }
        ]} />
        <div className="xl:col-span-3 card-surface p-4">
          <FilterBar>
            <div className="w-full max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search subject, message, user, or thread id" /></div>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="replied">Replied</option>
              <option value="closed">Closed</option>
            </select>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
              {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </FilterBar>
        </div>
      </div>

      {!threads.length ? <EmptyState title="No support threads found" description="No support conversations match the current filters." /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {threads.map((thread) => (
          <article key={thread.id} className="card-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-text">{thread.subject}</p>
                <p className="mt-1 text-sm text-muted">{thread.first_name ? `${thread.first_name} ${thread.last_name || ''}`.trim() : thread.username} • {thread.category_label}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone[thread.status] || statusTone.open}`}>{thread.status}</span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{thread.last_message || 'No messages yet'}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted">
              <span className="inline-flex items-center gap-1"><MessageSquare size={13} /> {thread.message_count} messages</span>
              <span>{dateTime(thread.updated_at)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1 text-xs text-muted"><Inbox size={13} /> #{String(thread.id).slice(0, 8)}</span>
              <Link href={`/admin/support/${thread.id}`} className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black">Open thread</Link>
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={(pagination.page || 1) <= 1} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Previous</button>
        <button onClick={() => setPage((value) => ((pagination.totalPages || 1) > value ? value + 1 : value))} disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
