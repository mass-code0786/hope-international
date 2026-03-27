'use client';

export function TreeNode({ node, depth = 0 }) {
  if (!node) return null;

  return (
    <div className="space-y-2">
      <div className={`flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 ${depth > 0 ? 'ml-3 md:ml-6' : ''}`}>
        <div>
          <p className="text-xs font-semibold text-slate-800">{node.name}</p>
          <p className="text-[10px] text-slate-500">{node.side || 'Root'} | {node.status || 'active'}</p>
        </div>
        <span className={`h-2 w-2 rounded-full ${node.status === 'inactive' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
      </div>
      {node.children?.length ? (
        <div className="space-y-1.5 border-l border-slate-200 pl-2 md:pl-4">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
