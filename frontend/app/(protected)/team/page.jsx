'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitBranchPlus, MoveHorizontal } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
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

  if (meQuery.isLoading || teamSummaryQuery.isLoading || treeRootQuery.isLoading) return <TeamSkeleton />;
  if (meQuery.isError || teamSummaryQuery.isError || treeRootQuery.isError) {
    return <ErrorState message="Team tree is temporarily unavailable." onRetry={() => { meQuery.refetch(); teamSummaryQuery.refetch(); treeRootQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Team" />

      <TeamSummaryPanel me={me} teamSummary={teamSummary} children={directChildren} />

      <section className="card-surface overflow-hidden p-5">
        <div className="flex flex-col gap-4 border-b border-[var(--hope-border)] pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="hope-kicker"><GitBranchPlus size={12} /> Binary Tree</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-text">Expandable genealogy view</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Tap any member card to open that member&apos;s left and right structure. The tree loads each branch only when you expand it, so larger networks stay responsive.</p>
          </div>
          <div className="rounded-[24px] border border-[var(--hope-border)] bg-cardSoft px-4 py-3 text-sm text-muted">
            <div className="inline-flex items-center gap-2 font-semibold text-text"><MoveHorizontal size={16} className="text-accent" /> Drag or scroll horizontally on mobile</div>
            <p className="mt-1 text-xs text-muted">Each node opens its own subtree without leaving this page.</p>
          </div>
        </div>

        {root ? (
          <div className="mt-5 rounded-[28px] border border-[var(--hope-border)] bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.1),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(241,245,249,0.68))] p-4 dark:bg-[radial-gradient(circle_at_top,rgba(94,234,212,0.1),transparent_35%),linear-gradient(180deg,rgba(8,15,24,0.82),rgba(11,18,29,0.76))] sm:p-6">
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
