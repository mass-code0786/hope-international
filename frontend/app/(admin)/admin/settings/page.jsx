'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { SummaryPanel } from '@/components/admin/SummaryPanel';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminSettings, updateAdminSettings } from '@/lib/services/admin';
import { REWARD_SLABS, RANKS } from '@/lib/constants/theme';
import { useAuthStore } from '@/lib/store/authStore';
import { isDemoUser } from '@/lib/utils/demoMode';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const demoMode = isDemoUser(user);
  const settingsQuery = useQuery({ queryKey: queryKeys.adminSettings, queryFn: getAdminSettings });
  const [form, setForm] = useState({
    matchPercentage: 10,
    directPercentage: 5,
    pvBvRatio: 0.4,
    carryForward: false
  });

  useEffect(() => {
    const settings = settingsQuery.data?.data || {};
    const compensation = settings.compensationSettings || {};
    setForm({
      matchPercentage: compensation.matchPercentage ?? 10,
      directPercentage: compensation.directPercentage ?? 5,
      pvBvRatio: compensation.pvBvRatio ?? 0.4,
      carryForward: compensation.carryForward ?? false
    });
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateAdminSettings({
        compensationSettings: {
          matchPercentage: Number(form.matchPercentage),
          directPercentage: Number(form.directPercentage),
          pvBvRatio: Number(form.pvBvRatio),
          carryForward: Boolean(form.carryForward)
        }
      }),
    onSuccess: async (result) => {
      toast.success(result.message || 'Settings updated');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminSettings });
    },
    onError: (error) => toast.error(error.message || 'Unable to update settings')
  });

  if (settingsQuery.isLoading) return <AdminShellSkeleton />;
  if (settingsQuery.isError) return <ErrorState message="Unable to load settings." onRetry={settingsQuery.refetch} />;

  const settings = settingsQuery.data?.data || {};
  const rankMultipliers = Array.isArray(settings.rankMultipliers) && settings.rankMultipliers.length ? settings.rankMultipliers : RANKS.map((r) => ({ name: r.name, capMultiplier: r.capMultiplier }));
  const rewardSlabs = Array.isArray(settings.rewardSlabs) && settings.rewardSlabs.length ? settings.rewardSlabs : REWARD_SLABS;

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Settings & Configuration" subtitle="Compensation and reward configuration from backend settings store" />
      {demoMode ? <p className="text-xs text-amber-300">Demo mode is active. Settings updates are blocked.</p> : null}

      <div className="card-surface p-4">
        <p className="text-sm font-semibold text-text">Compensation Settings</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-muted">
            Matching %
            <input
              type="number"
              value={form.matchPercentage}
              onChange={(e) => setForm((p) => ({ ...p, matchPercentage: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text"
            />
          </label>
          <label className="text-sm text-muted">
            Direct %
            <input
              type="number"
              value={form.directPercentage}
              onChange={(e) => setForm((p) => ({ ...p, directPercentage: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text"
            />
          </label>
          <label className="text-sm text-muted">
            PV/BV Ratio
            <input
              type="number"
              step="0.01"
              value={form.pvBvRatio}
              onChange={(e) => setForm((p) => ({ ...p, pvBvRatio: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={form.carryForward} onChange={(e) => setForm((p) => ({ ...p, carryForward: e.target.checked }))} />
            Carry Forward Enabled
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || demoMode} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
            {demoMode ? 'Disabled in Demo' : saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SummaryPanel title="Rank Multipliers" items={rankMultipliers.map((r) => ({ label: r.name, value: `${r.capMultiplier}x` }))} />
        <SummaryPanel title="Reward Slabs" items={rewardSlabs.map((r) => ({ label: `${r.thresholdBv} BV`, value: r.rewardLabel || r.label }))} />
      </div>
    </div>
  );
}
