export function SectionHeader({ title, subtitle, action, eyebrow = '' }) {
  return (
    <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <span className="hope-kicker mb-2.5">{eyebrow}</span> : null}
        <h2 className="text-xl font-semibold tracking-[-0.04em] text-text sm:text-[1.7rem]">{title}</h2>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
