'use client';

export function TreeNode({ node, depth = 0 }) {
  if (!node) return null;

  return (
    <div className="space-y-3">
      <div className={`card-surface flex items-center justify-between p-3 ${depth > 0 ? 'ml-4 md:ml-8' : ''}`}>
        <div>
          <p className="text-sm font-semibold text-text">{node.name}</p>
          <p className="text-xs text-muted">{node.side || 'Root'} | {node.status || 'active'}</p>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${node.status === 'inactive' ? 'bg-danger' : 'bg-success'}`} />
      </div>
      {node.children?.length ? (
        <div className="space-y-2 border-l border-white/10 pl-2 md:pl-6">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
