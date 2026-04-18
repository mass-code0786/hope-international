'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  CircleDot,
  Loader2,
  Plus,
  X
} from 'lucide-react';
import { getTeamTreeNode } from '@/lib/services/teamService';
import { queryKeys } from '@/lib/query/queryKeys';

const AUTO_HIDE_MS = 10000;

function hasEmbeddedChildren(node) {
  return Boolean(node) && Object.prototype.hasOwnProperty.call(node, 'children');
}

function isRenderableNode(node) {
  return Boolean(node) && typeof node === 'object' && (node.id != null || node.memberId != null || node.username || node.displayName);
}

function getNodeId(node) {
  return node?.id || node?.memberId || null;
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

function subtreeSlotLabel(slot) {
  switch (slot) {
    case 'left':
      return 'Left Child';
    case 'right':
      return 'Right Child';
    case 'left-left':
      return 'Left Left';
    case 'left-right':
      return 'Left Right';
    case 'right-left':
      return 'Right Left';
    case 'right-right':
      return 'Right Right';
    default:
      return 'Current Root';
  }
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

function shouldFetchBranchNode(node) {
  return Boolean(getNodeId(node) && node?.hasChildren && !hasEmbeddedChildren(node));
}

export function BinaryTreeExplorer({ root }) {
  const rootId = getNodeId(root);
  const previewTimerRef = useRef(null);
  const previousRootIdRef = useRef(rootId);
  const [previewNode, setPreviewNode] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeRootId, setActiveRootId] = useState(rootId);
  const [activeRootSeed, setActiveRootSeed] = useState(root);

  function clearPreviewTimer() {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }

  function closePreview() {
    clearPreviewTimer();
    setPreviewNode(null);
  }

  useEffect(() => () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!rootId) return;
    if (previousRootIdRef.current === rootId) return;
    previousRootIdRef.current = rootId;
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setPreviewNode(null);
    setHistory([]);
    setActiveRootId(rootId);
    setActiveRootSeed(root);
  }, [rootId, root]);

  if (!root || !rootId) return null;

  const currentRootQuery = useQuery({
    queryKey: queryKeys.teamTreeNode(activeRootId),
    queryFn: () => getTeamTreeNode(activeRootId),
    enabled: Boolean(activeRootId && activeRootId !== rootId),
    staleTime: 60000,
    placeholderData: () => {
      if (activeRootId === rootId) return root;
      return getNodeId(activeRootSeed) === activeRootId ? activeRootSeed : undefined;
    }
  });

  const currentRoot = activeRootId === rootId
    ? root
    : currentRootQuery.data || (getNodeId(activeRootSeed) === activeRootId ? activeRootSeed : null);

  const currentRootChildren = resolveChildSlots(currentRoot);
  const loadingRootChildren = Boolean(activeRootId !== rootId && currentRootQuery.isFetching && !hasEmbeddedChildren(currentRoot));
  const leftNode = loadingRootChildren ? null : currentRootChildren.leftNode;
  const rightNode = loadingRootChildren ? null : currentRootChildren.rightNode;

  const leftBranchQuery = useQuery({
    queryKey: leftNode?.id ? queryKeys.teamTreeNode(leftNode.id) : ['team-tree', 'slot', activeRootId, 'left'],
    queryFn: () => getTeamTreeNode(leftNode.id),
    enabled: shouldFetchBranchNode(leftNode),
    staleTime: 60000,
    placeholderData: () => (hasEmbeddedChildren(leftNode) ? leftNode : undefined)
  });

  const rightBranchQuery = useQuery({
    queryKey: rightNode?.id ? queryKeys.teamTreeNode(rightNode.id) : ['team-tree', 'slot', activeRootId, 'right'],
    queryFn: () => getTeamTreeNode(rightNode.id),
    enabled: shouldFetchBranchNode(rightNode),
    staleTime: 60000,
    placeholderData: () => (hasEmbeddedChildren(rightNode) ? rightNode : undefined)
  });

  const resolvedLeftNode = leftBranchQuery.data || leftNode;
  const resolvedRightNode = rightBranchQuery.data || rightNode;
  const leftGrandchildren = resolveChildSlots(resolvedLeftNode);
  const rightGrandchildren = resolveChildSlots(resolvedRightNode);

  const loadingLeftGrandchildren = Boolean(
    !loadingRootChildren
      && leftNode
      && leftNode.hasChildren
      && !hasEmbeddedChildren(resolvedLeftNode)
      && (leftBranchQuery.isPending || leftBranchQuery.isFetching)
  );

  const loadingRightGrandchildren = Boolean(
    !loadingRootChildren
      && rightNode
      && rightNode.hasChildren
      && !hasEmbeddedChildren(resolvedRightNode)
      && (rightBranchQuery.isPending || rightBranchQuery.isFetching)
  );

  const slots = {
    root: { node: currentRoot, loading: Boolean(!currentRoot) },
    left: { node: leftNode, loading: loadingRootChildren },
    right: { node: rightNode, loading: loadingRootChildren },
    'left-left': { node: loadingRootChildren ? null : leftGrandchildren.leftNode, loading: loadingRootChildren || loadingLeftGrandchildren },
    'left-right': { node: loadingRootChildren ? null : leftGrandchildren.rightNode, loading: loadingRootChildren || loadingLeftGrandchildren },
    'right-left': { node: loadingRootChildren ? null : rightGrandchildren.leftNode, loading: loadingRootChildren || loadingRightGrandchildren },
    'right-right': { node: loadingRootChildren ? null : rightGrandchildren.rightNode, loading: loadingRootChildren || loadingRightGrandchildren }
  };

  function queuePreview(node) {
    if (!node) return;
    clearPreviewTimer();
    setPreviewNode(node);
    previewTimerRef.current = setTimeout(() => {
      setPreviewNode(null);
      previewTimerRef.current = null;
    }, AUTO_HIDE_MS);
  }

  function handleExpand(node) {
    const nextId = getNodeId(node);
    if (!nextId || nextId === activeRootId) return;

    closePreview();
    setHistory((current) => [...current, { id: activeRootId, snapshot: currentRoot }]);
    setActiveRootId(nextId);
    setActiveRootSeed(node);
  }

  function handleBack() {
    if (!history.length) return;

    const previous = history[history.length - 1];
    closePreview();
    setHistory((current) => current.slice(0, -1));
    setActiveRootId(previous.id);
    setActiveRootSeed(previous.snapshot);
  }

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-white/7 bg-[linear-gradient(180deg,rgba(16,18,24,0.92),rgba(9,11,16,0.98))] shadow-[0_20px_56px_rgba(0,0,0,0.38)]">
      <div className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">Subtree Navigator</p>
            <h3 className="mt-1 text-sm font-semibold tracking-[-0.03em] text-white">{displayNodeName(currentRoot)}</h3>
            <p className="mt-1 text-[11px] text-white/48">Showing one compact 7-member binary view at a time.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/6 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/48">
              <CircleDot size={10} />
              Level {history.length}
            </span>
            <button
              type="button"
              onClick={handleBack}
              disabled={history.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/72 transition hover:border-white/18 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          </div>
        </div>

        {currentRootQuery.isError && activeRootId !== rootId ? (
          <p className="mt-2 text-[11px] text-amber-200/78">Unable to refresh this subtree right now. Cached member details are still shown where available.</p>
        ) : null}
      </div>

      <div
        className="relative overflow-auto px-2 py-3 sm:px-3 sm:py-4"
        style={{ touchAction: 'pan-x pan-y pinch-zoom', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="relative bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.12),transparent_34%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.08),transparent_38%)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(255,255,255,0.022)_96%),linear-gradient(90deg,transparent_95%,rgba(255,255,255,0.022)_96%)] bg-[length:20px_20px]" />

          <div className="relative mx-auto min-w-[304px] max-w-[520px] px-1 py-2 sm:min-w-[360px] sm:px-3 sm:py-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeRootId}
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.985 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <SevenNodeTree
                  slots={slots}
                  onPreview={queuePreview}
                  onExpand={handleExpand}
                />
              </motion.div>
            </AnimatePresence>
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

function SevenNodeTree({ slots, onPreview, onExpand }) {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="grid w-full grid-cols-4 gap-x-2 gap-y-0 sm:gap-x-3">
        <div className="col-span-4 flex justify-center">
          <TreeSlot
            slot="root"
            node={slots.root.node}
            loading={slots.root.loading}
            isRoot
            onPreview={onPreview}
            onExpand={onExpand}
          />
        </div>
      </div>

      <ConnectorLevelOne />

      <div className="grid w-full grid-cols-4 gap-x-2 gap-y-0 sm:gap-x-3">
        <div className="col-span-2 flex justify-center">
          <TreeSlot
            slot="left"
            node={slots.left.node}
            loading={slots.left.loading}
            onPreview={onPreview}
            onExpand={onExpand}
          />
        </div>
        <div className="col-span-2 flex justify-center">
          <TreeSlot
            slot="right"
            node={slots.right.node}
            loading={slots.right.loading}
            onPreview={onPreview}
            onExpand={onExpand}
          />
        </div>
      </div>

      <ConnectorLevelTwo />

      <div className="grid w-full grid-cols-4 gap-x-2 gap-y-0 sm:gap-x-3">
        <div className="flex justify-center">
          <TreeSlot
            slot="left-left"
            node={slots['left-left'].node}
            loading={slots['left-left'].loading}
            onPreview={onPreview}
            onExpand={onExpand}
          />
        </div>
        <div className="flex justify-center">
          <TreeSlot
            slot="left-right"
            node={slots['left-right'].node}
            loading={slots['left-right'].loading}
            onPreview={onPreview}
            onExpand={onExpand}
          />
        </div>
        <div className="flex justify-center">
          <TreeSlot
            slot="right-left"
            node={slots['right-left'].node}
            loading={slots['right-left'].loading}
            onPreview={onPreview}
            onExpand={onExpand}
          />
        </div>
        <div className="flex justify-center">
          <TreeSlot
            slot="right-right"
            node={slots['right-right'].node}
            loading={slots['right-right'].loading}
            onPreview={onPreview}
            onExpand={onExpand}
          />
        </div>
      </div>
    </div>
  );
}

function TreeSlot({ slot, node, loading = false, isRoot = false, onPreview, onExpand }) {
  const widthClass = isRoot ? 'w-[96px] sm:w-[108px]' : 'w-[72px] sm:w-[84px]';

  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      <span className="inline-flex h-6 items-center justify-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-white/46 sm:text-[9px]">
        {subtreeSlotLabel(slot)}
      </span>

      {loading ? (
        <LoadingTreeCard widthClass={widthClass} />
      ) : node ? (
        <MemberTreeCard node={node} slot={slot} widthClass={widthClass} onPreview={onPreview} />
      ) : (
        <EmptyTreeCard slot={slot} widthClass={widthClass} />
      )}

      <div className="flex h-7 items-center justify-center">
        {node ? (
          isRoot ? (
            <span className="inline-flex items-center rounded-full border border-emerald-400/18 bg-emerald-400/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-emerald-200/75 sm:text-[9px]">
              Current View
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onExpand?.(node)}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-white/10 bg-white/6 px-2.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-white/72 transition hover:border-white/18 hover:bg-white/10 sm:text-[9px]"
            >
              Expand
            </button>
          )
        ) : (
          <span className="h-7" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

function MemberTreeCard({ node, slot, widthClass, onPreview }) {
  return (
    <button
      type="button"
      data-tree-node
      onClick={() => onPreview?.(node)}
      aria-label={`Preview ${displayNodeName(node)} in the ${subtreeSlotLabel(slot)} slot`}
      className={`group relative flex ${widthClass} min-h-[88px] min-w-0 flex-col items-center overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,29,39,0.94),rgba(13,15,21,0.98))] px-2 py-2 text-center shadow-[0_12px_28px_rgba(0,0,0,0.3)] transition duration-200 hover:-translate-y-0.5 hover:border-white/18 sm:min-h-[96px] sm:rounded-[18px]`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),transparent_45%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.12),transparent_45%)] opacity-80" />
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-[11px] border border-white/12 bg-white/7 text-[10px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-9 sm:w-9 sm:text-[11px]">
        {node?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.avatarUrl} alt={displayNodeName(node)} className="h-full w-full rounded-[11px] object-cover" />
        ) : (
          nodeInitials(node)
        )}
      </span>

      <div className="relative mt-2 w-full min-w-0">
        <p className="truncate text-[10px] font-semibold tracking-[-0.02em] text-white sm:text-[11px]">{displayNodeName(node)}</p>
        <p className="mt-0.5 truncate text-[8px] text-white/48 sm:text-[9px]">@{node?.username || String(node?.memberId || node?.id || '').slice(0, 8)}</p>
      </div>

      <div className="relative mt-2 flex items-center gap-1">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${node?.isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/52">{slotLabel(node?.placementSide || 'root')}</span>
      </div>
    </button>
  );
}

function EmptyTreeCard({ slot, widthClass }) {
  return (
    <div
      className={`flex ${widthClass} min-h-[88px] flex-col items-center justify-center rounded-[16px] border border-dashed border-white/12 bg-white/[0.03] px-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:min-h-[96px] sm:rounded-[18px]`}
      aria-label={`${subtreeSlotLabel(slot)} empty slot`}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-[11px] border border-white/10 bg-white/5 text-white/62">
        <Plus size={14} />
      </span>
      <p className="mt-2 text-[10px] font-semibold text-white/70">Empty</p>
      <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-white/34">Open Slot</p>
    </div>
  );
}

function LoadingTreeCard({ widthClass }) {
  return (
    <div className={`flex ${widthClass} min-h-[88px] items-center justify-center rounded-[16px] border border-white/10 bg-[rgba(17,20,28,0.92)] text-white/55 shadow-[0_12px_24px_rgba(0,0,0,0.24)] sm:min-h-[96px] sm:rounded-[18px]`}>
      <Loader2 size={16} className="animate-spin" />
    </div>
  );
}

function ConnectorLevelOne() {
  return (
    <div className="relative my-1 h-6 w-full">
      <div className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />
      <div className="absolute left-[25%] right-[25%] top-2.5 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.28),rgba(255,255,255,0.06))]" />
      <div className="absolute left-[25%] top-2.5 h-3.5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))]" />
      <div className="absolute left-[75%] top-2.5 h-3.5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))]" />
    </div>
  );
}

function ConnectorLevelTwo() {
  return (
    <div className="relative my-1 h-6 w-full">
      <div className="absolute left-[25%] top-0 h-2.5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))]" />
      <div className="absolute left-[75%] top-0 h-2.5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))]" />

      <div className="absolute left-[12.5%] top-2.5 h-px w-[25%] bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.28),rgba(255,255,255,0.06))]" />
      <div className="absolute left-[62.5%] top-2.5 h-px w-[25%] bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.28),rgba(255,255,255,0.06))]" />

      <div className="absolute left-[12.5%] top-2.5 h-3.5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))]" />
      <div className="absolute left-[37.5%] top-2.5 h-3.5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))]" />
      <div className="absolute left-[62.5%] top-2.5 h-3.5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))]" />
      <div className="absolute left-[87.5%] top-2.5 h-3.5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08))]" />
    </div>
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
