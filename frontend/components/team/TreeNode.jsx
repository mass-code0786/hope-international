'use client';

import { Badge } from '@/components/ui/Badge';

export function TreeNode({ node, depth = 0 }) {
  if (!node) return null;

  const active = node.status !== 'inactive';

  return (
    <div className="space-y-2">
      <div className={`rounded-[22px] border border-[var(--hope-border)] bg-card p-3 shadow-soft ${depth > 0 ? 'ml-3 md:ml-6' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text">{node.name}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted">{node.side || 'Root node'}</p>
          </div>
          <Badge variant={active ? 'success' : 'warning'}>{active ? 'Active' : 'Inactive'}</Badge>
        </div>
      </div>
      {node.children?.length ? (
        <div className="space-y-2 border-l border-[var(--hope-border)] pl-3 md:pl-5">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
