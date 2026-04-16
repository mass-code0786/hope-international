'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  CircleDot,
  Loader2,
  Minus,
  Move,
  Plus,
  X
} from 'lucide-react';
import { getTeamTreeNode } from '@/lib/services/teamService';
import { queryKeys } from '@/lib/query/queryKeys';

const MIN_SCALE = 0.75;
const MAX_SCALE = 1.8;
const ZOOM_STEP = 0.15;
const AUTO_HIDE_MS = 10000;

function hasEmbeddedChildren(node) {
  return Boolean(node) && Object.prototype.hasOwnProperty.call(node, 'children');
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

function clampScale(value) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value) || 1));
}

function getRankLabel(node) {
  return node?.rankName || node?.rank || 'Unranked';
}

function getPvValue(node, key) {
  const value = node?.[key];
  return value == null ? null : Number(value);
}

export function BinaryTreeExplorer({ root }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [previewNode, setPreviewNode] = useState(null);
  const previewTimerRef = useRef(null);
  const dragStateRef = useRef(null);
  const pinchStateRef = useRef(null);

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

  function zoomIn() {
    setScale((current) => clampScale(current + ZOOM_STEP));
  }

  function zoomOut() {
    setScale((current) => clampScale(current - ZOOM_STEP));
  }

  function resetView() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    if (event.target.closest('[data-tree-node]') || event.target.closest('[data-tree-popup]')) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setOffset({
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY)
    });
  }

  function handlePointerUp(event) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleTouchStart(event) {
    if (event.touches.length !== 2) {
      pinchStateRef.current = null;
      return;
    }

    const [first, second] = event.touches;
    pinchStateRef.current = {
      distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
      scale
    };
  }

  function handleTouchMove(event) {
    if (event.touches.length !== 2 || !pinchStateRef.current) return;

    const [first, second] = event.touches;
    const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
    if (!distance || !pinchStateRef.current.distance) return;

    const ratio = distance / pinchStateRef.current.distance;
    setScale(clampScale(pinchStateRef.current.scale * ratio));
  }

  function handleTouchEnd(event) {
    if (event.touches.length < 2) {
      pinchStateRef.current = null;
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,20,27,0.96),rgba(10,12,18,0.98))] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-3 border-b border-white/8 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Interactive Binary View</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={zoomOut}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:border-white/20 hover:bg-white/10"
            aria-label="Zoom out"
          >
            <Minus size={16} />
          </button>
          <div className="min-w-[64px] rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-center text-xs font-semibold text-white/72">
            {Math.round(scale * 100)}%
          </div>
          <button
            type="button"
            onClick={zoomIn}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:border-white/20 hover:bg-white/10"
            aria-label="Zoom in"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/72 transition hover:border-white/20 hover:bg-white/10"
          >
            <Move size={14} />
            Reset
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden px-2 py-3 sm:px-4 sm:py-4">
        <div
          className="relative overflow-hidden rounded-[20px] border border-white/6 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.15),transparent_38%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.12),transparent_42%),rgba(8,10,15,0.95)]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none', cursor: dragStateRef.current ? 'grabbing' : 'grab' }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(255,255,255,0.03)_96%),linear-gradient(90deg,transparent_95%,rgba(255,255,255,0.03)_96%)] bg-[length:24px_24px]" />
          <div
            className="relative mx-auto min-w-max px-3 py-4 sm:px-6 sm:py-6"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center top',
              transition: dragStateRef.current ? 'none' : 'transform 180ms ease-out'
            }}
          >
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
              className="pointer-events-none absolute inset-x-3 bottom-3 z-20 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[340px]"
            >
              <div className="pointer-events-auto overflow-hidden rounded-[24px] border border-white/14 bg-[linear-gradient(155deg,rgba(31,35,48,0.86),rgba(11,13,19,0.92))] p-4 text-white shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_34%)]" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/12 bg-white/8 text-sm font-semibold tracking-[0.12em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      {nodeInitials(previewNode)}
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{slotLabel(previewNode?.placementSide || 'root')} member</p>
                      <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-white">
                        {previewNode?.displayName || displayNodeName(previewNode)}
                      </h3>
                      <p className="mt-1 text-sm text-white/62">@{previewNode?.username || String(previewNode?.memberId || previewNode?.id || '').slice(0, 8)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closePreview}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/72 transition hover:border-white/20 hover:bg-white/10"
                    aria-label="Close member details"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="relative mt-4 grid grid-cols-2 gap-2.5 text-sm">
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
  const children = hasEmbeddedChildren(resolvedNode) ? resolvedNode.children : null;
  const leftNode = children?.left || null;
  const rightNode = children?.right || null;
  const loadingChildren = nodeQuery.isLoading && node?.hasChildren && !embeddedChildren;

  return (
    <div className="relative flex flex-col items-center pt-[128px]">
      <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <TreeMemberCard node={resolvedNode} side="root" onPreview={onPreview} widthClass="w-[104px]" />
        <ExpandCollapseButton expanded={expanded} onClick={() => setExpanded((current) => !current)} />
      </div>

      {expanded ? (
        <div className="relative mt-2 flex flex-col items-center pt-2">
          <div className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />
          <div className="relative pt-2">
            <div className="absolute left-1/4 right-1/4 top-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />
            <div className="absolute left-1/4 top-0 h-2.5 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />
            <div className="absolute right-1/4 top-0 h-2.5 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              <BinaryTreeSlot side="left" node={leftNode} loading={loadingChildren} onPreview={onPreview} />
              <BinaryTreeSlot side="right" node={rightNode} loading={loadingChildren} onPreview={onPreview} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BinaryTreeNode({ node, side = 'root', defaultExpanded = false, onPreview }) {
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

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col items-center gap-1.5">
        <TreeMemberCard node={resolvedNode} side={side} onPreview={onPreview} widthClass="w-[98px] sm:w-[112px]" />
        <ExpandCollapseButton expanded={expanded} onClick={() => setExpanded((current) => !current)} />
      </div>

      {expanded ? (
        <div className="relative mt-2 flex w-full min-w-[216px] flex-col items-center pt-2 sm:min-w-[280px]">
          <div className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />
          <div className="relative w-full pt-2">
            <div className="absolute left-1/4 right-1/4 top-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />
            <div className="absolute left-1/4 top-0 h-2.5 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />
            <div className="absolute right-1/4 top-0 h-2.5 w-px bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))]" />

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              <BinaryTreeSlot side="left" node={leftNode} loading={loadingChildren} onPreview={onPreview} />
              <BinaryTreeSlot side="right" node={rightNode} loading={loadingChildren} onPreview={onPreview} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BinaryTreeSlot({ side, node, loading = false, onPreview }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/48">
        <CircleDot size={8} />
        {slotLabel(side)}
      </span>

      {loading ? (
        <div className="flex h-[96px] w-[98px] items-center justify-center rounded-[22px] border border-white/10 bg-[rgba(17,20,28,0.92)] text-white/55 shadow-[0_16px_34px_rgba(0,0,0,0.28)] sm:w-[112px]">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : node ? (
        <BinaryTreeNode node={node} side={side} onPreview={onPreview} />
      ) : (
        <div className="flex h-[96px] w-[98px] flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-white/[0.04] px-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:w-[112px]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-white/62">
            <Plus size={13} />
          </span>
          <p className="mt-2 text-[10px] font-semibold text-white/72">Empty slot</p>
        </div>
      )}
    </div>
  );
}

function TreeMemberCard({ node, side, onPreview, widthClass }) {
  return (
    <button
      type="button"
      data-tree-node
      onClick={() => onPreview?.(node)}
      className={`group relative flex ${widthClass} flex-col items-center overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(25,29,39,0.96),rgba(13,15,21,0.98))] px-2.5 py-2.5 text-center shadow-[0_18px_40px_rgba(0,0,0,0.38)] transition duration-200 hover:-translate-y-0.5 hover:border-white/18`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),transparent_45%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.12),transparent_45%)] opacity-80" />
      <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/12 bg-white/7 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
        {node?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.avatarUrl} alt={displayNodeName(node)} className="h-full w-full rounded-[14px] object-cover" />
        ) : (
          nodeInitials(node)
        )}
      </span>

      <div className="relative mt-2 w-full">
        <p className="truncate text-[11px] font-semibold tracking-[-0.02em] text-white">{displayNodeName(node)}</p>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${node?.isActive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/48">{slotLabel(side)}</span>
        </div>
      </div>
    </button>
  );
}

function ExpandCollapseButton({ expanded, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/60 transition hover:border-white/18 hover:bg-white/10"
    >
      {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      {expanded ? 'Collapse' : 'Expand'}
    </button>
  );
}

function PreviewStat({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.05] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white/88">{value}</p>
    </div>
  );
}
