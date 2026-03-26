export function AdminSectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Administration</p>
        <h2 className="text-xl font-semibold text-text">{title}</h2>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
