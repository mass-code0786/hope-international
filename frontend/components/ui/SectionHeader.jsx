export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
