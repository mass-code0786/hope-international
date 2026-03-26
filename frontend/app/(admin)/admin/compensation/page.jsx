'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { SummaryPanel } from '@/components/admin/SummaryPanel';
import { ActionPanel } from '@/components/admin/ActionPanel';
import { DataTable } from '@/components/admin/DataTable';
import { ConfirmationModal } from '@/components/admin/ConfirmationModal';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { queryKeys } from '@/lib/query/queryKeys';
import {
  getAdminMonthlyCompensation,
  getAdminMonthlyCompensationDetail,
  getAdminWeeklyCompensation,
  getAdminWeeklyCompensationDetail,
  runMonthlyRewards,
  runWeeklyMatching
} from '@/lib/services/admin';
import { number, shortDate } from '@/lib/utils/format';

function getCycleDefaults() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    cycleStart: monday.toISOString().slice(0, 10),
    cycleEnd: sunday.toISOString().slice(0, 10),
    monthStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    monthEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  };
}

function runFeedback(error) {
  const msg = String(error?.message || '').toLowerCase();
  if (msg.includes('already')) return 'Cycle already processed. No duplicate execution was performed.';
  if (msg.includes('409')) return 'Cycle already processed (idempotent no-op).';
  return error?.message || 'Compensation run failed';
}

export default function AdminCompensationPage() {
  const defaults = getCycleDefaults();
  const [weeklyForm, setWeeklyForm] = useState({ cycleStart: defaults.cycleStart, cycleEnd: defaults.cycleEnd, notes: '' });
  const [monthlyForm, setMonthlyForm] = useState({ monthStart: defaults.monthStart, monthEnd: defaults.monthEnd, notes: '' });
  const [confirmMode, setConfirmMode] = useState('');
  const [weeklyCycleId, setWeeklyCycleId] = useState('');
  const [monthlyCycleId, setMonthlyCycleId] = useState('');
  const queryClient = useQueryClient();

  const weeklyQuery = useQuery({
    queryKey: [...queryKeys.adminCompensationWeekly, 1],
    queryFn: () => getAdminWeeklyCompensation({ page: 1, limit: 10 })
  });
  const monthlyQuery = useQuery({
    queryKey: [...queryKeys.adminCompensationMonthly, 1],
    queryFn: () => getAdminMonthlyCompensation({ page: 1, limit: 10 })
  });
  const weeklyDetailQuery = useQuery({
    queryKey: queryKeys.adminCompensationWeeklyDetail(weeklyCycleId),
    queryFn: () => getAdminWeeklyCompensationDetail(weeklyCycleId),
    enabled: Boolean(weeklyCycleId)
  });
  const monthlyDetailQuery = useQuery({
    queryKey: queryKeys.adminCompensationMonthlyDetail(monthlyCycleId),
    queryFn: () => getAdminMonthlyCompensationDetail(monthlyCycleId),
    enabled: Boolean(monthlyCycleId)
  });

  const weeklyMutation = useMutation({
    mutationFn: () => runWeeklyMatching(weeklyForm),
    onSuccess: async (result) => {
      toast.success(result.message || 'Weekly cycle processed successfully');
      setConfirmMode('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminCompensation });
    },
    onError: (err) => toast.error(runFeedback(err))
  });

  const monthlyMutation = useMutation({
    mutationFn: () => runMonthlyRewards(monthlyForm),
    onSuccess: async (result) => {
      toast.success(result.message || 'Monthly rewards processed successfully');
      setConfirmMode('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminCompensation });
    },
    onError: (err) => toast.error(runFeedback(err))
  });

  if (weeklyQuery.isLoading || monthlyQuery.isLoading) return <AdminShellSkeleton />;
  if (weeklyQuery.isError) return <ErrorState message="Weekly compensation data unavailable." onRetry={weeklyQuery.refetch} />;
  if (monthlyQuery.isError) return <ErrorState message="Monthly compensation data unavailable." onRetry={monthlyQuery.refetch} />;

  const weeklyRuns = Array.isArray(weeklyQuery.data?.data) ? weeklyQuery.data.data : [];
  const monthlyRuns = Array.isArray(monthlyQuery.data?.data) ? monthlyQuery.data.data : [];
  const latestWeekly = weeklyRuns[0] || {};
  const latestMonthly = monthlyRuns[0] || {};

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Compensation Operations" subtitle="Cycle monitoring and payout engine controls" />

      <div className="grid gap-4 xl:grid-cols-2">
        <SummaryPanel
          title="Current Weekly Cycle"
          items={[
            { label: 'Status', value: latestWeekly.cycle_start ? 'Closed' : 'Unknown' },
            { label: 'Cycle', value: latestWeekly.cycle_start ? `${shortDate(latestWeekly.cycle_start)} - ${shortDate(latestWeekly.cycle_end)}` : 'N/A' },
            { label: 'Matched PV', value: number(latestWeekly.total_matched_pv) },
            { label: 'Overflow', value: number(latestWeekly.total_overflow) }
          ]}
        />

        <SummaryPanel
          title="Current Monthly Cycle"
          items={[
            { label: 'Status', value: latestMonthly.month_start ? 'Calculated' : 'Unknown' },
            { label: 'Cycle', value: latestMonthly.month_start ? `${shortDate(latestMonthly.month_start)} - ${shortDate(latestMonthly.month_end)}` : 'N/A' },
            { label: 'Qualified Users', value: number(latestMonthly.qualified_users) },
            { label: 'Reward Amount', value: number(latestMonthly.total_reward_amount) }
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActionPanel title="Run Weekly Matching" description="Runs weekly cycle close with idempotency checks.">
          <div className="grid gap-2 md:grid-cols-2">
            <input type="date" value={weeklyForm.cycleStart} onChange={(e) => setWeeklyForm((p) => ({ ...p, cycleStart: e.target.value }))} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input type="date" value={weeklyForm.cycleEnd} onChange={(e) => setWeeklyForm((p) => ({ ...p, cycleEnd: e.target.value }))} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input value={weeklyForm.notes} onChange={(e) => setWeeklyForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="md:col-span-2 rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <button onClick={() => setConfirmMode('weekly')} className="md:col-span-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black">
              Run Weekly Matching
            </button>
          </div>
        </ActionPanel>

        <ActionPanel title="Run Monthly Rewards" description="Calculates monthly reward qualification and payouts.">
          <div className="grid gap-2 md:grid-cols-2">
            <input type="date" value={monthlyForm.monthStart} onChange={(e) => setMonthlyForm((p) => ({ ...p, monthStart: e.target.value }))} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input type="date" value={monthlyForm.monthEnd} onChange={(e) => setMonthlyForm((p) => ({ ...p, monthEnd: e.target.value }))} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input value={monthlyForm.notes} onChange={(e) => setMonthlyForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="md:col-span-2 rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <button onClick={() => setConfirmMode('monthly')} className="md:col-span-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black">
              Run Monthly Rewards
            </button>
          </div>
        </ActionPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataTable
          columns={[
            { key: 'cycle_start', title: 'Start', className: 'col-span-3', render: (r) => shortDate(r.cycle_start) },
            { key: 'cycle_end', title: 'End', className: 'col-span-3', render: (r) => shortDate(r.cycle_end) },
            { key: 'matched_pv', title: 'Matched PV', className: 'col-span-3', render: (r) => number(r.total_matched_pv) },
            { key: 'status', title: 'Action', className: 'col-span-3', render: (r) => <button onClick={() => setWeeklyCycleId(r.id)} className="rounded-lg bg-white/5 px-2 py-1 text-xs">Detail</button> }
          ]}
          rows={weeklyRuns}
        />

        <DataTable
          columns={[
            { key: 'month_start', title: 'Start', className: 'col-span-3', render: (r) => shortDate(r.month_start) },
            { key: 'month_end', title: 'End', className: 'col-span-3', render: (r) => shortDate(r.month_end) },
            { key: 'qualified', title: 'Qualified', className: 'col-span-3', render: (r) => number(r.qualified_users) },
            { key: 'status', title: 'Action', className: 'col-span-3', render: (r) => <button onClick={() => setMonthlyCycleId(r.id)} className="rounded-lg bg-white/5 px-2 py-1 text-xs">Detail</button> }
          ]}
          rows={monthlyRuns}
        />
      </div>

      {weeklyCycleId ? (
        <SummaryPanel
          title="Weekly Cycle Detail"
          items={[
            { label: 'Users', value: number(weeklyDetailQuery.data?.data?.users?.length) },
            { label: 'Gross Income', value: number(weeklyDetailQuery.data?.data?.summary?.total_gross_income) },
            { label: 'Net Income', value: number(weeklyDetailQuery.data?.data?.summary?.total_paid_income) },
            { label: 'Flushed PV', value: number(weeklyDetailQuery.data?.data?.summary?.total_flushed_pv) }
          ]}
        />
      ) : null}

      {monthlyCycleId ? (
        <SummaryPanel
          title="Monthly Cycle Detail"
          items={[
            { label: 'Users', value: number(monthlyDetailQuery.data?.data?.users?.length) },
            { label: 'Monthly BV', value: number(monthlyDetailQuery.data?.data?.summary?.total_monthly_bv) },
            { label: 'Monthly PV', value: number(monthlyDetailQuery.data?.data?.summary?.total_monthly_pv) },
            { label: 'Reward Amount', value: number(monthlyDetailQuery.data?.data?.summary?.total_reward_amount) }
          ]}
        />
      ) : null}

      <ConfirmationModal
        open={Boolean(confirmMode)}
        title={confirmMode === 'weekly' ? 'Confirm Weekly Matching Run' : 'Confirm Monthly Reward Run'}
        description="This operation impacts payouts and audit ledgers. Ensure cycle inputs are correct."
        onCancel={() => setConfirmMode('')}
        onConfirm={() => (confirmMode === 'weekly' ? weeklyMutation.mutate() : monthlyMutation.mutate())}
        loading={weeklyMutation.isPending || monthlyMutation.isPending}
        confirmText="Run Now"
      />
    </div>
  );
}
