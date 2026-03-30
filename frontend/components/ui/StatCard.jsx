import { motion } from 'framer-motion';

const toneClass = {
  default: 'from-white/95 via-white/88 to-slate-50/92 dark:from-slate-950/90 dark:via-slate-900/88 dark:to-slate-900/76',
  primary: 'from-teal-500/[0.18] via-white/92 to-amber-100/65 dark:from-teal-400/[0.18] dark:via-slate-950/94 dark:to-amber-400/[0.08]',
  success: 'from-emerald-400/[0.16] via-white/92 to-cyan-100/70 dark:from-emerald-400/[0.16] dark:via-slate-950/94 dark:to-cyan-400/[0.08]'
};

export function StatCard({ title, value, subtitle, right, className = '', emphasis = 'default', compact = false }) {
  const containerClass = compact ? 'p-4' : 'p-5';
  const titleClass = compact ? 'text-[10px]' : 'text-[11px]';
  const valueClass = compact ? 'mt-2 text-xl' : emphasis === 'primary' ? 'mt-3 text-3xl' : 'mt-3 text-[1.75rem]';
  const subtitleClass = compact ? 'mt-2 text-xs' : 'mt-2 text-sm';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`hope-grid-card relative overflow-hidden rounded-[26px] border bg-gradient-to-br ${toneClass[emphasis] || toneClass.default} ${containerClass} ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-white/70 dark:bg-white/10" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`uppercase tracking-[0.22em] text-muted ${titleClass}`}>{title}</p>
          <p className={`font-semibold tracking-[-0.05em] text-text ${valueClass}`}>{value}</p>
          {subtitle ? <p className={`max-w-[18rem] text-muted ${subtitleClass}`}>{subtitle}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </motion.div>
  );
}
