'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitBranchPlus } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { TeamSkeleton } from '@/components/ui/PageSkeletons';
import { getTeamSummary, getTeamTreeRoot } from '@/lib/services/teamService';
import { getMe } from '@/lib/services/authService';
import { queryKeys } from '@/lib/query/queryKeys';
import { TeamSummaryPanel } from '@/components/team/TeamSummaryPanel';
import { BinaryTreeExplorer } from '@/components/team/BinaryTreeExplorer';

export default function TeamPage() {
  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: getMe });
  const teamSummaryQuery = useQuery({ queryKey: queryKeys.teamSummary, queryFn: getTeamSummary });
  const treeRootQuery = useQuery({ queryKey: queryKeys.teamTreeRoot, queryFn: getTeamTreeRoot });

  const me = meQuery.data || {};
  const teamSummary = teamSummaryQuery.data || {};
  const root = treeRootQuery.data || null;
  const directChildren = useMemo(() => [root?.children?.left, root?.children?.right].filter(Boolean), [root]);

  if (process.env.NODE_ENV !== 'production') {
    console.info('[team.frontend] team-page-data', {
      teamSummary,
      rootChildren: {
        left: root?.children?.left?.username || null,
        right: root?.children?.right?.username || null
      }
    });
  }

  if (meQuery.isLoading || teamSummaryQuery.isLoading || treeRootQuery.isLoading) return <TeamSkeleton />;
  if (meQuery.isError || teamSummaryQuery.isError || treeRootQuery.isError) {
    return <ErrorState message="Team tree is temporarily unavailable." onRetry={() => { meQuery.refetch(); teamSummaryQuery.refetch(); treeRootQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-text">Team Overview</h1>
      </div>

      <TeamSummaryPanel me={me} teamSummary={teamSummary} children={directChildren} />

      <section className="overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(145deg,#1a1d24,#0f1115)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_0_40px_rgba(124,58,237,0.08)]">
        <div className="flex items-center gap-2 border-b border-[var(--hope-border)] pb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent">
            <GitBranchPlus size={16} />
          </span>
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-text">Binary Team</h2>
        </div>

        {root ? (
          <div className="mt-5 rounded-[16px] border border-[rgba(255,255,255,0.05)] bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.15),transparent_60%),radial-gradient(circle_at_bottom,rgba(34,197,94,0.12),transparent_60%),#0f1115] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_0_40px_rgba(124,58,237,0.08)] sm:p-6">
            <BinaryTreeExplorer root={root} />
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState title="No team yet" description="Start referring users to build your binary tree." action={<Link href="/profile" className="hope-button">Start referring users</Link>} />
          </div>
        )}
      </section>
    </div>
  );
}
