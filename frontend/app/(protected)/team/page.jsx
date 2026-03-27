'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { TreeNode } from '@/components/team/TreeNode';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { TeamSkeleton } from '@/components/ui/PageSkeletons';
import { getTeamChildren } from '@/lib/services/teamService';
import { getMe } from '@/lib/services/authService';
import { queryKeys } from '@/lib/query/queryKeys';
import { shortDate } from '@/lib/utils/format';

export default function TeamPage() {
  const [view, setView] = useState('tree');
  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: getMe });
  const teamQuery = useQuery({ queryKey: queryKeys.teamChildren, queryFn: getTeamChildren });

  const me = meQuery.data || {};
  const children = Array.isArray(teamQuery.data) ? teamQuery.data : [];
  const hasNestedTreeData = children.some((c) => Array.isArray(c.children) && c.children.length > 0);

  const root = useMemo(() => ({
    id: me.id || 'root',
    name: me.username || 'You',
    side: 'Root',
    status: 'active',
    children: children.map((c) => ({
      id: c.id,
      name: c.username || 'Member',
      side: c.placement_side || 'N/A',
      status: c.status || 'active',
      children: Array.isArray(c.children) ? c.children : []
    }))
  }), [me, children]);

  const leftCount = children.filter((c) => c.placement_side === 'left').length;
  const rightCount = children.filter((c) => c.placement_side === 'right').length;

  if (meQuery.isLoading || teamQuery.isLoading) return <TeamSkeleton />;
  if (meQuery.isError || teamQuery.isError) {
    return <ErrorState message="Team details are temporarily unavailable." onRetry={() => { meQuery.refetch(); teamQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-3">
      <SectionHeader title="Binary Team" subtitle="Compact network overview" />

      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={hasNestedTreeData ? 'success' : 'accent'}>{hasNestedTreeData ? 'Full Tree Data' : 'Direct Children View'}</Badge>
          <p className="text-[11px] text-slate-500">
            {hasNestedTreeData
              ? 'Displaying expanded tree data from backend.'
              : 'Showing verified direct children while deeper tree API is pending.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard compact title="Total Team" value={children.length} />
        <StatCard compact title="Active" value={children.length} subtitle="Inactive endpoint pending" />
        <StatCard compact title="Left Team" value={leftCount} />
        <StatCard compact title="Right Team" value={rightCount} />
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setView('tree')} className={`rounded-lg px-2.5 py-1.5 text-[11px] ${view === 'tree' ? 'bg-sky-100 text-sky-700' : 'border border-slate-200 bg-white text-slate-600'}`}>Tree</button>
        <button onClick={() => setView('list')} className={`rounded-lg px-2.5 py-1.5 text-[11px] ${view === 'list' ? 'bg-sky-100 text-sky-700' : 'border border-slate-200 bg-white text-slate-600'}`}>List</button>
      </div>

      {view === 'tree' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-2.5">
          <TreeNode node={root} />
        </div>
      ) : (
        <div className="space-y-2">
          {children.length === 0 ? <EmptyState title="No team members yet" description="Share your referral link to build both binary legs." /> : null}
          {children.map((member, idx) => (
            <div key={member?.id || idx} className="rounded-xl border border-slate-200 bg-white p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{member?.username || 'Member'}</p>
                  <p className="text-[11px] text-slate-500">Joined {shortDate(member?.created_at)}</p>
                </div>
                <Badge variant="accent">{String(member?.placement_side || 'N/A').toUpperCase()}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
