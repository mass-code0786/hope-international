export function AdminShellSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-72 animate-pulse rounded-xl bg-white/10" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="h-32 animate-pulse rounded-2xl bg-white/10" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-white/10" />
    </div>
  );
}
