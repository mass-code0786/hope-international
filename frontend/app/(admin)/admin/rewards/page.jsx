'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { REWARD_SLABS } from '@/lib/constants/theme';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminRewardQualifications, getAdminRewardsSummary, updateAdminRewardQualificationStatus } from '@/lib/services/admin';
import { currency, number } from '@/lib/utils/format';

export default function AdminRewardsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const rewardsQuery = useQuery({
    queryKey: [...queryKeys.adminRewards, month, status, page],
    queryFn: () => getAdminRewardQualifications({ month, status, page, limit: 10 })
  });
  const summaryQuery = useQuery({
    queryKey: [...queryKeys.adminRewardsSummary, month],
    queryFn: () => getAdminRewardsSummary({ month })
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }) => updateAdminRewardQualificationStatus(id, nextStatus),
    onSuccess: async (result) => {
      toast.success(result.message || 'Reward status updated');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminRewards }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminRewardsSummary })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Failed to update reward status')
  });

  if (rewardsQuery.isLoading || summaryQuery.isLoading) return <AdminShellSkeleton />;
  if (rewardsQuery.isError) return <ErrorState message="Unable to load rewards." onRetry={rewardsQuery.refetch} />;
  if (summaryQuery.isError) return <ErrorState message="Unable to load reward summary." onRetry={summaryQuery.refetch} />;

  const rewardsEnvelope = rewardsQuery.data || {};
  const rewards = Array.isArray(rewardsEnvelope.data) ? rewardsEnvelope.data : [];
  const pagination = rewardsEnvelope.pagination || {};
  const summary = summaryQuery.data?.data || {};

  const stats = {
    qualified: Number(summary.qualified_count || 0),
    pending: Number(summary.pending_count || 0),
    processed: Number(summary.processed_count || 0)
  };

  return (
    <div className="space-y-5">
      <AdminSectionHeader
        title="Rewards Management"
        subtitle="Track monthly matching-BV milestones and qualified users"
        action={
          <div className="flex gap-2">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
              <option value="all">All</option>
              <option value="qualified">Qualified</option>
              <option value="pending">Pending</option>
              <option value="processed">Processed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REWARD_SLABS.map((slab) => (
          <div key={slab.thresholdBv} className="card-surface border border-accent/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Milestone</p>
            <p className="mt-1 text-lg font-semibold text-text">{number(slab.thresholdBv)} Matching BV</p>
            <p className="text-sm text-accentSoft">{slab.label}</p>
            <p className="mt-2 text-xs text-muted">Cash: {currency(slab.rewardAmount)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-surface p-4 text-sm">Qualified: <span className="font-semibold text-success">{stats.qualified}</span></div>
        <div className="card-surface p-4 text-sm">Pending: <span className="font-semibold text-accentSoft">{stats.pending}</span></div>
        <div className="card-surface p-4 text-sm">Processed: <span className="font-semibold text-text">{stats.processed}</span></div>
      </div>

      <DataTable
        columns={[
          { key: 'username', title: 'User', className: 'col-span-3', render: (r) => r.username || `#${String(r.user_id || '').slice(0, 8)}` },
          { key: 'matching_bv', title: 'Matching BV', className: 'col-span-2', render: (r) => number(r.matching_bv || r.monthly_bv || r.total_bv) },
          { key: 'reward_label', title: 'Reward', className: 'col-span-4', render: (r) => r.reward_label || r.reward_level || 'Pending' },
          { key: 'status', title: 'Status', className: 'col-span-2', render: (r) => <StatusBadge status={r.status || 'pending'} /> },
          {
            key: 'action',
            title: 'Action',
            className: 'col-span-1',
            render: (r) => (
              <select
                className="rounded-lg border border-white/10 bg-cardSoft px-2 py-1 text-xs text-text"
                defaultValue=""
                onChange={(e) => statusMutation.mutate({ id: r.id, nextStatus: e.target.value })}
              >
                <option value="" disabled>Update</option>
                <option value="qualified">Qualified</option>
                <option value="pending">Pending</option>
                <option value="processed">Processed</option>
                <option value="rejected">Rejected</option>
              </select>
            )
          }
        ]}
        rows={rewards}
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
