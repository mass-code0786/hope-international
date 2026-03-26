export function ProgressBar({ value = 0, color = 'bg-accent' }) {
  const normalized = Math.min(100, Math.max(0, Number(value || 0)));
  return (
    <div className="h-2 w-full rounded-full bg-white/10">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${normalized}%` }} />
    </div>
  );
}
