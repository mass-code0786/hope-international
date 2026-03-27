import { motion } from 'framer-motion';

export function StatCard({ title, value, subtitle, right, className = '', emphasis = 'default', compact = false }) {
  const emphasisClass =
    emphasis === 'primary'
      ? 'border border-accent/[0.22] bg-gradient-to-br from-accent/[0.08] via-cardSoft/[0.95] to-card'
      : emphasis === 'success'
        ? 'border border-success/[0.20] bg-gradient-to-br from-success/[0.08] via-cardSoft/[0.95] to-card'
        : 'border border-white/5';

  const containerClass = compact ? 'p-3.5' : 'p-5';
  const titleClass = compact ? 'text-[10px]' : 'text-xs';
  const valueClass = compact ? 'mt-1.5 text-lg' : emphasis === 'primary' ? 'mt-2 text-3xl' : 'mt-2 text-2xl';
  const subtitleClass = compact ? 'mt-1 text-xs' : 'mt-1 text-sm';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-surface ${containerClass} ${emphasisClass} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`uppercase tracking-wider text-muted ${titleClass}`}>{title}</p>
          <p className={`font-semibold text-text ${valueClass}`}>{value}</p>
          {subtitle ? <p className={`text-muted ${subtitleClass}`}>{subtitle}</p> : null}
        </div>
        {right}
      </div>
    </motion.div>
  );
}
