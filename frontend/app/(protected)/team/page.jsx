'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TreeNode } from '@/components/team/TreeNode';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { TeamSkeleton } from '@/components/ui/PageSkeletons';
import { getTeamChildren, getTeamSummary } from '@/lib/services/teamService';
import { getMe } from '@/lib/services/authService';
import { queryKeys } from '@/lib/query/queryKeys';
import { shortDate } from '@/lib/utils/format';
import { TeamSummaryPanel } from '@/components/team/TeamSummaryPanel';

export default function TeamPage() {
  const [view, setView] = useState('list');
  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: getMe });
  const teamQuery = useQuery({ queryKey: queryKeys.teamChildren, queryFn: getTeamChildren });
  const teamSummaryQuery = useQuery({ queryKey: queryKeys.teamSummary, queryFn: getTeamSummary });

  const me = meQuery.data || {};
  const children = Array.isArray(teamQuery.data) ? teamQuery.data : [];
  const teamSummary = teamSummaryQuery.data || {};
  const hasNestedTreeData = children.some((c) => Array.isArray(c.children) && c.children.length > 0);

  const root = useMemo(() => ({
    id: me.id || 'root',
    name: me.username || 'You',
    side: 'Root',
    status: me?.is_active === false ? 'inactive' : 'active',
    children: children.map((c) => ({
      id: c.id,
      name: c.username || 'Member',
      side: c.placement_side || 'N/A',
      status: c.is_active === false ? 'inactive' : 'active',
      children: Array.isArray(c.children) ? c.children : []
    }))
  }), [me, children]);

  if (meQuery.isLoading || teamQuery.isLoading || teamSummaryQuery.isLoading) return <TeamSkeleton />;
  if (meQuery.isError || teamQuery.isError || teamSummaryQuery.isError) {
    return <ErrorState message="Team details are temporarily unavailable." onRetry={() => { meQuery.refetch(); teamQuery.refetch(); teamSummaryQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Binary Team" subtitle="A clearer view of your direct referrals, team status, carry balance, and what the currently available genealogy API is actually returning." />

      <TeamSummaryPanel me={me} teamSummary={teamSummary} children={children} hasNestedTreeData={hasNestedTreeData} />

      <div className="card-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={hasNestedTreeData ? 'success' : 'warning'}>{hasNestedTreeData ? 'Expanded tree detected' : 'Showing direct team only'}</Badge>
              <Badge variant="accent">Referral list</Badge>
            </div>
            <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-text">Direct team members</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Each card shows placement, join date, and account status so the page is easier to understand without reading raw backend fields.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView('list')} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${view === 'list' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-900' : 'border border-[var(--hope-border)] bg-card text-muted'}`}>List</button>
            <button onClick={() => setView('tree')} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${view === 'tree' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-900' : 'border border-[var(--hope-border)] bg-card text-muted'}`}>Tree</button>
          </div>
        </div>
      </div>

      {view === 'tree' ? (
        <div className="card-surface p-4">
          <TreeNode node={root} />
        </div>
      ) : children.length ? (
        <div className="grid gap-3">
          {children.map((member, idx) => {
            const active = member?.is_active !== false;
            return (
              <div key={member?.id || idx} className="card-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-text">{member?.first_name || member?.last_name ? `${member?.first_name || ''} ${member?.last_name || ''}`.trim() : member?.username || 'Member'}</p>
                    <p className="mt-1 text-sm text-muted">@{member?.username || 'member'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                      <span>Joined {shortDate(member?.created_at)}</span>
                      <span>Placement {String(member?.placement_side || 'N/A').toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={active ? 'success' : 'warning'}>{active ? 'Active' : 'Inactive'}</Badge>
                    <Badge variant="accent">{String(member?.placement_side || 'N/A').toUpperCase()}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No team yet" description="Start referring users to begin building your left and right team legs." action={<Link href="/profile" className="hope-button">Start referring users</Link>} />
      )}
    </div>
  );
}
