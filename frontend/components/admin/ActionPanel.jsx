export function ActionPanel({ title, description, children }) {
  return (
    <div className="card-surface border border-white/10 p-4">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}
