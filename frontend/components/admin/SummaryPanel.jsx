export function SummaryPanel({ title, items = [] }) {
  return (
    <div className="card-surface p-4">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((item, idx) => (
          <div key={`${item.label}-${idx}`} className="flex items-center justify-between text-sm">
            <span className="text-muted">{item.label}</span>
            <span className="text-text">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
