import { Inbox } from 'lucide-react';

export function EmptyState({ title, description, action }) {
  return (
    <div className="card-surface flex min-h-52 flex-col items-center justify-center border border-white/10 p-7 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent">
        <Inbox size={22} />
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-muted">No Data</p>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-text">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
