'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitBranchPlus } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { getTeamSummary, getTeamTreeRoot } from '@/lib/services/teamService';
import { queryKeys } from '@/lib/query/queryKeys';
import { TeamSummaryPanel } from '@/components/team/TeamSummaryPanel';
import { BinaryTreeExplorer } from '@/components/team/BinaryTreeExplorer';
import { useSessionUser } from '@/hooks/useSessionUser';

export default function TeamPage() {
  const sessionUser = useSessionUser();
  const teamSummaryQuery = useQuery({ queryKey: queryKeys.teamSummary, queryFn: getTeamSummary, placeholderData: (previousData) => previousData });
  const treeRootQuery = useQuery({ queryKey: queryKeys.teamTreeRoot, queryFn: getTeamTreeRoot, placeholderData: (previousData) => previousData });

  const me = sessionUser.data || {};
  const teamSummary = teamSummaryQuery.data || {};
  const root = treeRootQuery.data || null;
  const directChildren = useMemo(() => [root?.children?.left, root?.children?.right].filter(Boolean), [root]);

  const isLoadingTeam = sessionUser.isPending || (teamSummaryQuery.isPending && !teamSummaryQuery.data) || (treeRootQuery.isPending && !treeRootQuery.data);

  if (isLoadingTeam) return null;
  if ((teamSummaryQuery.isError && !teamSummaryQuery.data) || (treeRootQuery.isError && !treeRootQuery.data)) {
    return <ErrorState message="Team tree is temporarily unavailable." onRetry={() => { teamSummaryQuery.refetch(); treeRootQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-text">Team Overview</h1>
      </div>

      <TeamSummaryPanel me={me} teamSummary={teamSummary} children={directChildren} />

      <section className="overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(145deg,#1a1d24,#0f1115)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_0_40px_rgba(124,58,237,0.08)]">
        <div className="flex items-start gap-3 border-b border-[var(--hope-border)] pb-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[1rem] bg-[var(--hope-accent-soft)] text-accent">
            <GitBranchPlus size={16} />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-text">Binary Team</h2>
          </div>
        </div>

        {root ? (
          <div className="mt-3.5">
            <BinaryTreeExplorer root={root} />
          </div>
        ) : (
          <div className="mt-3.5">
            <EmptyState title="No team yet" description="Start referring users to build your binary tree." action={<Link href="/profile" className="hope-button">Start referring users</Link>} />
          </div>
        )}
      </section>
    </div>
  );
}
