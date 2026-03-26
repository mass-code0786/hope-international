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
    <div className="space-y-5">
      <SectionHeader title="Binary Team" subtitle="Track your network structure and growth" />

      <div className="flex items-center gap-2">
        <Badge variant={hasNestedTreeData ? 'success' : 'accent'}>{hasNestedTreeData ? 'Full Tree Data' : 'Direct Children View'}</Badge>
        <p className="text-xs text-muted">
          {hasNestedTreeData
            ? 'Displaying expanded tree data from backend.'
            : 'Displaying verified direct children while deeper tree API is pending.'}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Team" value={children.length} />
        <StatCard title="Left Team" value={leftCount} />
        <StatCard title="Right Team" value={rightCount} />
        <StatCard title="Active" value={children.length} subtitle="Inactive tracking pending dedicated endpoint" />
      </div>

      <div className="flex gap-2">
        <button onClick={() => setView('tree')} className={`rounded-xl px-3 py-2 text-xs ${view === 'tree' ? 'bg-accent text-black' : 'bg-white/5 text-muted'}`}>Tree View</button>
        <button onClick={() => setView('list')} className={`rounded-xl px-3 py-2 text-xs ${view === 'list' ? 'bg-accent text-black' : 'bg-white/5 text-muted'}`}>List View</button>
      </div>

      {view === 'tree' ? (
        <div className="card-surface p-4">
          <TreeNode node={root} />
        </div>
      ) : (
        <div className="space-y-3">
          {children.length === 0 ? <EmptyState title="No team members yet" description="Start sharing your referral link to build both binary legs." /> : null}
          {children.map((member, idx) => (
            <div key={member?.id || idx} className="card-surface flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-text">{member?.username || 'Member'}</p>
                <p className="text-xs text-muted">Joined {shortDate(member?.created_at)}</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Badge variant="accent">{String(member?.placement_side || 'N/A').toUpperCase()}</Badge>
                <span className="text-success">Active</span>
                <span className="text-muted">BV/PV pending</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
