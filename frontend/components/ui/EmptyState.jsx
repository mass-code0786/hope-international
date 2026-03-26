export function EmptyState({ title, description, action }) {
  return (
    <div className="card-surface flex min-h-44 flex-col items-center justify-center border border-white/10 bg-gradient-to-b from-card to-cardSoft p-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">No Data</p>
      <h3 className="mt-2 text-base font-semibold text-text">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
