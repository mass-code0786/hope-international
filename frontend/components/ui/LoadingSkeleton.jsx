export function LoadingSkeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-[24px] border border-white/10 bg-white/50 dark:bg-white/5 ${className}`} />;
}
