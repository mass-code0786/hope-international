'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  CircleDot,
  Loader2,
  Plus,
  X
} from 'lucide-react';
import { getTeamTreeNode } from '@/lib/services/teamService';
import { queryKeys } from '@/lib/query/queryKeys';

const AUTO_HIDE_MS = 10000;
const MAX_VISIBLE_BLOCK_DEPTH = 2;

function hasEmbeddedChildren(node) {
  return Boolean(node) && Object.prototype.hasOwnProperty.call(node, 'children');
}

function isRenderableNode(node) {
  return Boolean(node) && typeof node === 'object' && (node.id != null || node.memberId != null || node.username || node.displayName);
}

function resolveChildSlots(node) {
  if (!hasEmbeddedChildren(node) || !node.children || typeof node.children !== 'object') {
    return { leftNode: null, rightNode: null };
  }

  return {
    leftNode: isRenderableNode(node.children.left) ? node.children.left : null,
    rightNode: isRenderableNode(node.children.right) ? node.children.right : null
  };
}

function slotLabel(side) {
  if (side === 'left') return 'Left';
  if (side === 'right') return 'Right';
  return 'Root';
}

function formatDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function displayNodeName(node) {
  return node?.username || node?.displayName || 'Member';
}

function nodeInitials(node) {
  const source = displayNodeName(node);
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'HM';
}

function getRankLabel(node) {
  return node?.rankName || node?.rank || 'Unranked';
}

function getPvValue(node, key) {
  const value = node?.[key];
  return value == null ? null : Number(value);
}

export function BinaryTreeExplorer({ root }) {
  const [previewNode, setPreviewNode] = useState(null);
  const previewTimerRef = useRef(null);

  useEffect(() => () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
  }, []);

  if (!root) return null;

  function queuePreview(node) {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setPreviewNode(node);
    previewTimerRef.current = setTimeout(() => {
      setPreviewNode(null);
      previewTimerRef.current = null;
    }, AUTO_HIDE_MS);
  }

  function closePreview() {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = null;
    setPreviewNode(null);
  }

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/7 bg-[linear-gradient(180deg,rgba(16,18,24,0.92),rgba(9,11,16,0.98))] shadow-[0_20px_56px_rgba(0,0,0,0.38)]">
      <div
        className="relative overflow-auto px-2 py-2.5 sm:px-3 sm:py-3"
        style={{ touchAction: 'pan-x pan-y pinch-zoom', WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="relative min-w-full bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.12),transparent_34%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_38%)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(255,255,255,0.022)_96%),linear-gradient(90deg,transparent_95%,rgba(255,255,255,0.022)_96%)] bg-[length:20px_20px]" />
          <div className="relative mx-auto w-max min-w-full px-2 py-3 sm:px-4 sm:py-4">
            <RootBinaryTreeNode node={root} onPreview={queuePreview} />
          </div>
        </div>

        <AnimatePresence>
          {previewNode ? (
            <motion.div
              data-tree-popup
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-x-2 bottom-2 z-20 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[320px]"
            >
              <div className="pointer-events-auto overflow-hidden rounded-[22px] border border-white/14 bg-[linear-gradient(155deg,rgba(31,35,48,0.86),rgba(11,13,19,0.92))] p-3.5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_34%)]" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/12 bg-white/8 text-sm font-semibold tracking-[0.12em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      {nodeInitials(previewNode)}
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{slotLabel(previewNode?.placementSide || 'root')} member</p>
                      <h3 className="mt-1 text-base font-semibold tracking-[-0.03em] text-white">
                        {previewNode?.displayName || displayNodeName(previewNode)}
                      </h3>
                      <p className="mt-1 text-[13px] text-white/62">@{previewNode?.username || String(previewNode?.memberId || previewNode?.id || '').slice(0, 8)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closePreview}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/72 transition hover:border-white/20 hover:bg-white/10"
                    aria-label="Close member details"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="relative mt-3 grid grid-cols-2 gap-2 text-sm">
                  <PreviewStat label="Referral ID" value={previewNode?.memberId || previewNode?.id || '-'} />
                  <PreviewStat label="Rank" value={getRankLabel(previewNode)} />
                  <PreviewStat label="Status" value={previewNode?.isActive ? 'Active' : 'Inactive'} />
                  <PreviewStat label="Placement" value={slotLabel(previewNode?.placementSide || 'root')} />
                  <PreviewStat label="Left PV" value={getPvValue(previewNode, 'leftPv') ?? getPvValue(previewNode, 'left_pv') ?? '-'} />
                  <PreviewStat label="Right PV" value={getPvValue(previewNode, 'rightPv') ?? getPvValue(previewNode, 'right_pv') ?? '-'} />
                  <PreviewStat label="Joined" value={formatDate(previewNode?.createdAt || previewNode?.created_at) || '-'} />
                  <PreviewStat label="Directs" value={Number(previewNode?.directCount || 0)} />
                </div>

                <p className="relative mt-3 text-[11px] uppercase tracking-[0.18em] text-white/40">Auto closes in 10 seconds</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RootBinaryTreeNode({ node, onPreview }) {
  const [expanded, setExpanded] = useState(true);
  const embeddedChildren = hasEmbeddedChildren(node);
  const shouldFetch = expanded && node?.hasChildren && !embeddedChildren;

  const nodeQuery = useQuery({
    queryKey: queryKeys.teamTreeNode(node.id),
    queryFn: () => getTeamTreeNode(node.id),
    enabled: shouldFetch,
    staleTime: 60000
  });

  const resolvedNode = nodeQuery.data || node;
  const { leftNode, rightNode } = resolveChildSlots(resolvedNode);
  const loadingChildren = nodeQuery.isLoading && node?.hasChildren && !embeddedChildren;
  const canExpand = Boolean(node?.hasChildren || leftNode || rightNode || loadingChildren);
  const showInlineChildren = expanded && MAX_VISIBLE_BLOCK_DEPTH > 0;

  return (
    <div className="flex w-full flex-col items-center gap-2.5">
      <div className="relative z-10 flex flex-col items-center gap-1">
        <TreeMemberCard node={resolvedNode} side="root" onPreview={onPreview} widthClass="w-[78px] sm:w-[88px]" />
        <ExpandCollapseButton expanded={expanded} onClick={() => setExpanded((current) => !current)} disabled={!canExpand} />
      </div>

      {expanded ? (
        <div className="relative flex w-full flex-col items-center pt-1.5">
          <div className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />
          {showInlineChildren ? (
            <InlineBranchLayout
              leftNode={leftNode}
              rightNode={rightNode}
              loading={loadingChildren}
              onPreview={onPreview}
              blockDepth={1}
            />
          ) : null}
          {expanded && MAX_VISIBLE_BLOCK_DEPTH === 0 ? (
            <ContinuationSection leftNode={leftNode} rightNode={rightNode} loading={loadingChildren} onPreview={onPreview} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BinaryTreeNode({ node, side = 'root', defaultExpanded = false, onPreview, blockDepth = 0 }) {
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
  const { leftNode, rightNode } = resolveChildSlots(resolvedNode);
  const loadingChildren = nodeQuery.isLoading && node?.hasChildren && !embeddedChildren;
  const canExpand = Boolean(node?.hasChildren || leftNode || rightNode || loadingChildren);
  const shouldShowInlineChildren = expanded && blockDepth < MAX_VISIBLE_BLOCK_DEPTH;
  const shouldShowContinuation = expanded && blockDepth >= MAX_VISIBLE_BLOCK_DEPTH;

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col items-center gap-1">
      <div className="flex flex-col items-center gap-1">
        <TreeMemberCard node={resolvedNode} side={side} onPreview={onPreview} widthClass="w-[74px] sm:w-[88px]" />
        <ExpandCollapseButton expanded={expanded} onClick={() => setExpanded((current) => !current)} disabled={!canExpand} />
      </div>

      {expanded ? (
        <div className="relative flex w-full min-w-0 flex-col items-center pt-1.5">
          <div className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />
          {shouldShowInlineChildren ? (
            <InlineBranchLayout
              leftNode={leftNode}
              rightNode={rightNode}
              loading={loadingChildren}
              onPreview={onPreview}
              blockDepth={blockDepth + 1}
            />
          ) : null}
          {shouldShowContinuation ? (
            <ContinuationSection leftNode={leftNode} rightNode={rightNode} loading={loadingChildren} onPreview={onPreview} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InlineBranchLayout({ leftNode, rightNode, loading = false, onPreview, blockDepth }) {
  return (
    <div className="relative flex w-full min-w-0 flex-col items-center pt-1.5">
      <div className="relative w-full min-w-[224px] pt-1.5 sm:min-w-[252px]">
        <div className="absolute left-1/4 right-1/4 top-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.28),rgba(255,255,255,0.06))]" />
        <div className="absolute left-1/4 top-0 h-2 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))]" />
        <div className="absolute right-1/4 top-0 h-2 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))]" />

        <div className="grid grid-cols-2 items-start gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-4">
          <BinaryTreeSlot side="left" node={leftNode} loading={loading} onPreview={onPreview} blockDepth={blockDepth} />
          <BinaryTreeSlot side="right" node={rightNode} loading={loading} onPreview={onPreview} blockDepth={blockDepth} />
        </div>
      </div>
    </div>
  );
}

function ContinuationSection({ leftNode, rightNode, loading = false, onPreview }) {
  return (
    <div className="relative mt-2.5 flex w-full min-w-0 flex-col items-center pt-2">
      <div className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />
      <div className="grid w-full min-w-[224px] items-start gap-2 sm:min-w-[252px] sm:grid-cols-2 sm:gap-3">
          <ContinuationSlot side="left" node={leftNode} loading={loading} onPreview={onPreview} />
          <ContinuationSlot side="right" node={rightNode} loading={loading} onPreview={onPreview} />
      </div>
    </div>
  );
}

function ContinuationSlot({ side, node, loading = false, onPreview }) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-1.5 rounded-[16px] border border-white/8 bg-white/[0.025] px-1.5 py-2">
      <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.14em] text-white/44">
        <CircleDot size={8} />
        {slotLabel(side)} continuation
      </span>

      <div className="flex w-full min-w-0 justify-center overflow-visible">
        {loading ? (
          <div className="flex h-[68px] w-[74px] items-center justify-center rounded-[16px] border border-white/10 bg-[rgba(17,20,28,0.92)] text-white/55 shadow-[0_12px_24px_rgba(0,0,0,0.24)] sm:h-[76px] sm:w-[88px] sm:rounded-[18px]">
            <Loader2 size={14} className="animate-spin" />
          </div>
        ) : node ? (
          <div className="flex min-w-fit justify-center">
            <BinaryTreeNode node={node} side={side} defaultExpanded blockDepth={0} onPreview={onPreview} />
          </div>
        ) : (
          <div className="flex h-[68px] w-[74px] flex-col items-center justify-center rounded-[16px] border border-dashed border-white/12 bg-white/[0.03] px-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:h-[76px] sm:w-[88px] sm:rounded-[18px] sm:px-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[9px] border border-white/10 bg-white/5 text-white/62 sm:h-7 sm:w-7 sm:rounded-[10px]">
              <CircleDot size={12} />
            </span>
            <p className="mt-1 text-[8px] font-semibold leading-tight text-white/68 sm:text-[9px]">No further user</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BinaryTreeSlot({ side, node, loading = false, onPreview, blockDepth }) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-1">
      <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.14em] text-white/44">
        <CircleDot size={8} />
        {slotLabel(side)}
      </span>

      <div className="flex w-full min-w-0 justify-center overflow-visible">
        {loading ? (
          <div className="flex h-[68px] w-[74px] items-center justify-center rounded-[16px] border border-white/10 bg-[rgba(17,20,28,0.92)] text-white/55 shadow-[0_12px_24px_rgba(0,0,0,0.24)] sm:h-[76px] sm:w-[88px] sm:rounded-[18px]">
            <Loader2 size={14} className="animate-spin" />
          </div>
        ) : node ? (
          <div className="flex min-w-fit justify-center">
            <BinaryTreeNode node={node} side={side} onPreview={onPreview} blockDepth={blockDepth} />
          </div>
        ) : (
          <div className="flex h-[68px] w-[74px] flex-col items-center justify-center rounded-[16px] border border-dashed border-white/12 bg-white/[0.03] px-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:h-[76px] sm:w-[88px] sm:rounded-[18px] sm:px-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[9px] border border-white/10 bg-white/5 text-white/62 sm:h-7 sm:w-7 sm:rounded-[10px]">
              <Plus size={13} />
            </span>
            <p className="mt-1 text-[8px] font-semibold leading-tight text-white/68 sm:text-[9px]">Empty slot</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TreeMemberCard({ node, side, onPreview, widthClass }) {
  return (
    <button
      type="button"
      data-tree-node
      onClick={() => onPreview?.(node)}
      className={`group relative flex ${widthClass} min-w-0 flex-col items-center overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,29,39,0.94),rgba(13,15,21,0.98))] px-1.5 py-1.5 text-center shadow-[0_12px_28px_rgba(0,0,0,0.3)] transition duration-200 hover:-translate-y-0.5 hover:border-white/18 sm:rounded-[18px] sm:px-2 sm:py-2`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),transparent_45%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.12),transparent_45%)] opacity-80" />
      <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/12 bg-white/7 text-[10px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-8 sm:w-8 sm:rounded-[11px] sm:text-[11px]">
        {node?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.avatarUrl} alt={displayNodeName(node)} className="h-full w-full rounded-[10px] object-cover sm:rounded-[11px]" />
        ) : (
          nodeInitials(node)
        )}
      </span>

      <div className="relative mt-1 w-full min-w-0 sm:mt-1.5">
        <p className="truncate text-[9px] font-semibold tracking-[-0.02em] text-white sm:text-[10px]">{displayNodeName(node)}</p>
        <div className="mt-0.5 flex items-center justify-center gap-1">
          <span className={`h-1 w-1 shrink-0 rounded-full ${node?.isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-[7px] font-semibold uppercase tracking-[0.16em] text-white/48">{slotLabel(side)}</span>
        </div>
      </div>
    </button>
  );
}

function ExpandCollapseButton({ expanded, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="inline-flex h-6 items-center gap-1 rounded-full border border-white/10 bg-white/6 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] text-white/60 transition hover:border-white/18 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:h-auto sm:gap-1 sm:px-2 sm:text-[8px] sm:tracking-[0.14em]"
    >
      {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      {disabled ? 'No Children' : expanded ? 'Collapse' : 'Expand'}
    </button>
  );
}

function PreviewStat({ label, value }) {
  return (
    <div className="rounded-[16px] border border-white/10 bg-white/[0.05] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/42">{label}</p>
      <p className="mt-1 truncate text-[13px] font-semibold text-white/88">{value}</p>
    </div>
  );
}
