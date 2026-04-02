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
    <div className="overflow-x-auto pb-1">
      <div className="mx-auto flex min-w-max justify-center px-2 pb-2 pt-1">
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
        className="group w-[108px] rounded-[18px] border border-[var(--hope-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] p-2 text-left shadow-[0_12px_24px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:border-[var(--hope-border-strong)] dark:bg-[linear-gradient(180deg,rgba(13,23,35,0.96),rgba(9,17,27,0.92))] sm:w-[122px]"
      >
        <div className="flex items-start justify-between gap-1.5">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-[var(--hope-accent-soft)] text-accent">
            <UserRound size={12} />
          </span>
          <Badge variant={statusVariant}>{resolvedNode?.isActive ? 'Active' : 'Inactive'}</Badge>
        </div>

        <div className="mt-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">{slotLabel(side)}</p>
          <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-text">{resolvedNode?.username || resolvedNode?.displayName || 'Member'}</p>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted">
          <span className="truncate">{String(resolvedNode?.memberId || resolvedNode?.id || '').slice(0, 6)}</span>
          <span>{Number(resolvedNode?.directCount || 0)}</span>
        </div>

        <div className="mt-1.5 flex items-center justify-between rounded-xl border border-[var(--hope-border)] bg-white/70 px-2 py-1.5 text-[10px] font-semibold text-text dark:bg-white/5">
          <span className="inline-flex items-center gap-1.5">
            <GitBranchPlus size={11} className="text-accent" />
            {expanded ? 'Hide' : 'Open'}
          </span>
          {expanded ? <ChevronDown size={12} className="text-muted" /> : <ChevronRight size={12} className="text-muted" />}
        </div>
      </button>

      {expanded ? (
        <div className="relative mt-2.5 flex w-full min-w-[250px] flex-col items-center pt-2.5 sm:min-w-[300px]">
          <div className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-[var(--hope-border-strong)]" />
          <div className="relative w-full pt-2.5">
            <div className="absolute left-1/4 right-1/4 top-0 h-px bg-[var(--hope-border-strong)]" />
            <div className="absolute left-1/4 top-0 h-2.5 w-px bg-[var(--hope-border-strong)]" />
            <div className="absolute right-1/4 top-0 h-2.5 w-px bg-[var(--hope-border-strong)]" />

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
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
    <div className="flex flex-col items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--hope-border)] bg-white/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted dark:bg-white/5">
        <CircleDot size={8} />
        {slotLabel(side)}
      </span>

      {loading ? (
        <div className="flex w-[108px] items-center justify-center rounded-[18px] border border-[var(--hope-border)] bg-cardSoft px-4 py-6 text-muted shadow-soft sm:w-[122px]">
          <Loader2 size={14} className="animate-spin" />
        </div>
      ) : node ? (
        <BinaryTreeNode node={node} side={side} />
      ) : (
        <div className="flex w-[108px] flex-col items-center justify-center rounded-[18px] border border-dashed border-[var(--hope-border-strong)] bg-white/55 px-3 py-4 text-center text-muted dark:bg-white/5 sm:w-[122px]">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--hope-border)] bg-white/80 text-sm text-accent dark:bg-white/10">+</span>
          <p className="mt-2 text-[11px] font-semibold text-text">Empty</p>
        </div>
      )}
    </div>
  );
}
