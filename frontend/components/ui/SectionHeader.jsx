export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <span className="hope-kicker mb-3">Hope International</span>
        <h2 className="text-xl font-semibold tracking-[-0.04em] text-text sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
