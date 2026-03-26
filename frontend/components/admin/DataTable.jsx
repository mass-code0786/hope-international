export function DataTable({ columns = [], rows = [], empty }) {
  if (!rows.length) {
    return empty || <div className="card-surface p-4 text-sm text-muted">No records found.</div>;
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="hidden grid-cols-12 gap-2 border-b border-white/10 p-3 text-xs uppercase text-muted md:grid">
        {columns.map((col) => (
          <div key={col.key} className={col.className || 'col-span-2'}>{col.title}</div>
        ))}
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((row, idx) => (
          <div key={row.id || idx} className="grid grid-cols-1 gap-2 p-3 md:grid-cols-12 md:items-center">
            {columns.map((col) => (
              <div key={col.key} className={col.className || 'col-span-2'}>
                <span className="text-[11px] uppercase text-muted md:hidden">{col.title}</span>
                <div className="text-sm text-text">{col.render ? col.render(row) : row[col.key]}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
