'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { FilterBar } from '@/components/admin/FilterBar';
import { SearchInput } from '@/components/admin/SearchInput';
import { DataTable } from '@/components/admin/DataTable';
import { SummaryPanel } from '@/components/admin/SummaryPanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminUsers, getAdminUserDetails, updateAdminUserStatus, updateAdminUserRank, getAdminRanks } from '@/lib/services/admin';
import { number, rankLabel, shortDate } from '@/lib/utils/format';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState('');
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: [...queryKeys.adminUsers, search, rankFilter, statusFilter, page],
    queryFn: () => getAdminUsers({ search, rank: rankFilter, status: statusFilter, page, limit: 10 })
  });
  const ranksQuery = useQuery({
    queryKey: queryKeys.adminRanks,
    queryFn: getAdminRanks
  });
  const detailsQuery = useQuery({
    queryKey: queryKeys.adminUserDetail(selectedUserId),
    queryFn: () => getAdminUserDetails(selectedUserId),
    enabled: Boolean(selectedUserId)
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }) => updateAdminUserStatus(userId, isActive),
    onSuccess: async (result) => {
      toast.success(result.message || 'User status updated');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminUserDetail(selectedUserId) })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Failed to update status')
  });

  const rankMutation = useMutation({
    mutationFn: ({ userId, rankId }) => updateAdminUserRank(userId, rankId),
    onSuccess: async (result) => {
      toast.success(result.message || 'User rank updated');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminUserDetail(selectedUserId) })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Failed to update rank')
  });

  if (usersQuery.isLoading) return <AdminShellSkeleton />;
  if (usersQuery.isError) return <ErrorState message="Unable to load users." onRetry={usersQuery.refetch} />;

  const usersEnvelope = usersQuery.data || {};
  const users = Array.isArray(usersEnvelope.data) ? usersEnvelope.data : [];
  const pagination = usersEnvelope.pagination || {};
  const detail = detailsQuery.data?.data || {};
  const ranksEnvelope = ranksQuery.data || {};
  const ranks = Array.isArray(ranksEnvelope.data) ? ranksEnvelope.data : [];
  const activeRanks = ranks.filter((rank) => rank?.is_active);

  const filtered = users.filter((u) => {
    const text = String(u.username || '') + ' ' + String(u.email || '') + ' ' + String(u.id || '');
    const matchesSearch = text.includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="User Management" subtitle="Search, inspect and monitor distributor network users" />

      <FilterBar>
        <div className="w-full max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, or ID" /></div>
        <select
          value={rankFilter}
          onChange={(e) => setRankFilter(e.target.value)}
          disabled={ranksQuery.isLoading || ranksQuery.isError}
          className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text disabled:opacity-60"
        >
          <option value="all">All ranks</option>
          {activeRanks.map((rank) => (
            <option key={rank.id} value={String(rank.name || '').toLowerCase()}>
              {rankLabel(rank.name)}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </FilterBar>
      {ranksQuery.isLoading ? <p className="text-xs text-muted">Loading rank options...</p> : null}
      {ranksQuery.isError ? (
        <ErrorState message="Rank options are temporarily unavailable." onRetry={ranksQuery.refetch} />
      ) : null}
      {!ranksQuery.isLoading && !ranksQuery.isError && ranks.length === 0 ? (
        <EmptyState title="No rank data found" description="No rank rows were returned from /admin/ranks." />
      ) : null}

      <SummaryPanel
        title="Users Snapshot"
        items={[
          { label: 'Rows', value: number(filtered.length) },
          { label: 'Page', value: `${pagination.page || 1} / ${pagination.totalPages || 1}` },
          { label: 'Total', value: number(pagination.totalItems || filtered.length) }
        ]}
      />

      <DataTable
        columns={[
          { key: 'id', title: 'User ID', className: 'col-span-2', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
          { key: 'username', title: 'Name', className: 'col-span-2' },
          { key: 'email', title: 'Email', className: 'col-span-3' },
          { key: 'sponsor_id', title: 'Sponsor', className: 'col-span-2', render: (row) => row.sponsor_id ? `#${String(row.sponsor_id).slice(0, 8)}` : 'N/A' },
          { key: 'rank_name', title: 'Rank', className: 'col-span-1', render: (row) => rankLabel(row.rank_name) },
          { key: 'created_at', title: 'Joined', className: 'col-span-1', render: (row) => shortDate(row.created_at) },
          { key: 'action', title: 'Action', className: 'col-span-1', render: (row) => <button onClick={() => setSelectedUserId(row.id)} className="rounded-lg bg-white/5 px-2 py-1 text-xs">Inspect</button> }
        ]}
        rows={filtered}
        empty={<EmptyState title="No users found" description="No users match your current filters." />}
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

      {selectedUserId ? (
        <div className="card-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">User Detail Panel</h3>
            <button onClick={() => setSelectedUserId('')} className="text-xs text-muted">Close</button>
          </div>
          {detailsQuery.isLoading ? <p className="text-sm text-muted">Loading details...</p> : null}
          {detailsQuery.isError ? <ErrorState message="Could not load user details." onRetry={detailsQuery.refetch} /> : null}
          {!detailsQuery.isLoading && !detailsQuery.isError ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SummaryPanel title="Profile" items={[
                { label: 'Name', value: detail.profile?.username || 'N/A' },
                { label: 'Email', value: detail.profile?.email || 'N/A' },
                { label: 'Rank', value: rankLabel(detail.profile?.rank_name) }
              ]} />
              <SummaryPanel title="Placement" items={[
                { label: 'Sponsor', value: detail.profile?.sponsor_id ? `#${String(detail.profile?.sponsor_id).slice(0, 8)}` : 'N/A' },
                { label: 'Parent', value: detail.profile?.parent_id ? `#${String(detail.profile?.parent_id).slice(0, 8)}` : 'N/A' },
                { label: 'Side', value: detail.profile?.placement_side || 'N/A' }
              ]} />
              <SummaryPanel title="Stats" items={[
                { label: 'Left PV', value: number(detail.profile?.carry_left_pv) },
                { label: 'Right PV', value: number(detail.profile?.carry_right_pv) },
                { label: 'Wallet', value: number(detail.wallet?.balance) }
              ]} />
            </div>
              <div className="grid gap-2 md:grid-cols-3">
                <button
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ userId: selectedUserId, isActive: false })}
                  className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger disabled:opacity-60"
                >
                  Set Inactive
                </button>
                <button
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ userId: selectedUserId, isActive: true })}
                  className="rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-sm text-success disabled:opacity-60"
                >
                  Set Active
                </button>
                <select
                  disabled={rankMutation.isPending}
                  onChange={(e) => rankMutation.mutate({ userId: selectedUserId, rankId: Number(e.target.value) })}
                  className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text"
                  defaultValue=""
                >
                  <option value="" disabled>Update Rank</option>
                  {activeRanks.map((rank) => (
                    <option key={rank.id} value={rank.id}>
                      {rankLabel(rank.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
