'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, CircleDot, GitBranchPlus, Loader2, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { getTeamTreeNode } from '@/lib/services/teamService';
import { queryKeys } from '@/lib/query/queryKeys';

function hasEmbeddedChildren(node) {
  return Boolean(node) && Object.prototype.hasOwnProperty.call(node, 'children');
}

function slotLabel(side) {
  if (side === 'left') return 'Left';
  if (side === 'right') return 'Right';
  return 'Root';
}

export function BinaryTreeExplorer({ root }) {
  if (!root) return null;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="mx-auto flex min-w-max justify-center px-4 pb-4 pt-2">
        <BinaryTreeNode node={root} side="root" defaultExpanded />
      </div>
    </div>
  );
}

function BinaryTreeNode({ node, side = 'root', defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const embeddedChildren = hasEmbeddedChildren(node);
  const shouldFetch = expanded && node?.hasChildren && !embeddedChildren;

  const nodeQuery = useQuery({
    queryKey: queryKeys.teamTreeNode(node.id),
    queryFn: () => getTeamTreeNode(node.id),
    enabled: shouldFetch,
    staleTime: 60000
  });

  const resolvedNode = nodeQuery.data || node;
  const children = hasEmbeddedChildren(resolvedNode) ? resolvedNode.children : null;
  const leftNode = children?.left || null;
  const rightNode = children?.right || null;
  const loadingChildren = nodeQuery.isLoading && node?.hasChildren && !embeddedChildren;
  const statusVariant = resolvedNode?.isActive ? 'success' : 'warning';
  const expandLabel = expanded ? 'Collapse' : 'Expand';

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="group w-[150px] rounded-[26px] border border-[var(--hope-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] p-3 text-left shadow-[0_18px_32px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-[var(--hope-border-strong)] dark:bg-[linear-gradient(180deg,rgba(13,23,35,0.96),rgba(9,17,27,0.92))] sm:w-[180px]"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent">
            <UserRound size={16} />
          </span>
          <Badge variant={statusVariant}>{resolvedNode?.isActive ? 'Active' : 'Inactive'}</Badge>
        </div>

        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{slotLabel(side)}</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-text">{resolvedNode?.displayName || resolvedNode?.username || 'Member'}</p>
          <p className="mt-1 text-[11px] text-muted">@{resolvedNode?.username || 'member'}</p>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
          <span className="truncate">ID {String(resolvedNode?.memberId || resolvedNode?.id || '').slice(0, 8)}</span>
          <span>{Number(resolvedNode?.directCount || 0)} direct</span>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-[var(--hope-border)] bg-white/70 px-3 py-2 text-[11px] font-semibold text-text dark:bg-white/5">
          <span className="inline-flex items-center gap-1.5">
            <GitBranchPlus size={13} className="text-accent" />
            {expandLabel}
          </span>
          {expanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
        </div>
      </button>

      {expanded ? (
        <div className="relative mt-4 flex w-full min-w-[320px] flex-col items-center pt-4 sm:min-w-[420px]">
          <div className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-[var(--hope-border-strong)]" />
          <div className="relative w-full pt-4">
            <div className="absolute left-1/4 right-1/4 top-0 h-px bg-[var(--hope-border-strong)]" />
            <div className="absolute left-1/4 top-0 h-4 w-px bg-[var(--hope-border-strong)]" />
            <div className="absolute right-1/4 top-0 h-4 w-px bg-[var(--hope-border-strong)]" />

            <div className="grid grid-cols-2 gap-4 sm:gap-8">
              <BinaryTreeSlot side="left" node={leftNode} loading={loadingChildren} />
              <BinaryTreeSlot side="right" node={rightNode} loading={loadingChildren} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BinaryTreeSlot({ side, node, loading = false }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--hope-border)] bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted dark:bg-white/5">
        <CircleDot size={10} />
        {slotLabel(side)}
      </span>

      {loading ? (
        <div className="flex w-[150px] items-center justify-center rounded-[24px] border border-[var(--hope-border)] bg-cardSoft px-4 py-10 text-muted shadow-soft sm:w-[180px]">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : node ? (
        <BinaryTreeNode node={node} side={side} />
      ) : (
        <div className="flex w-[150px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--hope-border-strong)] bg-white/55 px-4 py-8 text-center text-muted dark:bg-white/5 sm:w-[180px]">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--hope-border)] bg-white/80 text-lg text-accent dark:bg-white/10">+</span>
          <p className="mt-3 text-sm font-semibold text-text">Empty</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">{slotLabel(side)} slot</p>
        </div>
      )}
    </div>
  );
}
