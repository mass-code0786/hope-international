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
import { PageLoadingState } from '@/components/ui/PageLoadingState';
import { getEmptyTeamTreeState, getTeamTreeErrorState, isEmptyTeamTree } from '@/lib/utils/teamTreeState';

export default function TeamPage() {
  const sessionUser = useSessionUser();
  const teamSummaryQuery = useQuery({ queryKey: queryKeys.teamSummary, queryFn: getTeamSummary, placeholderData: (previousData) => previousData, retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const treeRootQuery = useQuery({ queryKey: queryKeys.teamTreeRoot, queryFn: getTeamTreeRoot, placeholderData: (previousData) => previousData, retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false });

  const me = sessionUser.data || {};
  const teamSummary = teamSummaryQuery.data || {};
  const root = treeRootQuery.data || null;
  const directChildren = useMemo(() => [root?.children?.left, root?.children?.right].filter(Boolean), [root]);
  const treeErrorState = treeRootQuery.isError && !root ? getTeamTreeErrorState(treeRootQuery.error) : null;
  const emptyTreeState = getEmptyTeamTreeState();
  const shouldShowEmptyTree = !treeErrorState && !treeRootQuery.isPending && isEmptyTeamTree(root);

  const isLoadingTeam = (teamSummaryQuery.isPending && !teamSummaryQuery.data) || (treeRootQuery.isPending && !treeRootQuery.data);

  if (isLoadingTeam) return <PageLoadingState title="Team Overview" subtitle="Loading your summary and binary team tree." />;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-text">Team Overview</h1>
      </div>

      {teamSummaryQuery.isError && !teamSummaryQuery.data ? (
        <ErrorState message="Team summary is temporarily unavailable." onRetry={teamSummaryQuery.refetch} />
      ) : (
        <TeamSummaryPanel me={me} teamSummary={teamSummary} children={directChildren} />
      )}

      <section className="rounded-[18px] border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(145deg,#1a1d24,#0f1115)] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_0_40px_rgba(124,58,237,0.08)] sm:p-4">
        <div className="flex items-start gap-2.5 border-b border-[var(--hope-border)] pb-2.5 sm:gap-3 sm:pb-3">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.9rem] bg-[var(--hope-accent-soft)] text-accent sm:h-8 sm:w-8 sm:rounded-[1rem]">
            <GitBranchPlus size={16} />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-text">Binary Team</h2>
          </div>
        </div>

        {treeErrorState ? (
          <div className="mt-3">
            {treeErrorState.kind === 'empty' ? (
              <EmptyState
                title={treeErrorState.title}
                description={treeErrorState.description}
                action={<Link href="/profile" className="hope-button">Start referring users</Link>}
              />
            ) : (
              <ErrorState
                type={treeErrorState.type}
                label={treeErrorState.label}
                message={treeErrorState.message}
                onRetry={treeRootQuery.refetch}
              />
            )}
          </div>
        ) : !shouldShowEmptyTree && root ? (
          <div className="mt-3">
            <BinaryTreeExplorer root={root} />
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              title={emptyTreeState.title}
              description={emptyTreeState.description}
              action={<Link href="/profile" className="hope-button">Start referring users</Link>}
            />
          </div>
        )}
      </section>
    </div>
  );
}
