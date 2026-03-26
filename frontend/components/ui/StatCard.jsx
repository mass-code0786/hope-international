import { motion } from 'framer-motion';

export function StatCard({ title, value, subtitle, right, className = '', emphasis = 'default' }) {
  const emphasisClass =
    emphasis === 'primary'
      ? 'border border-accent/[0.22] bg-gradient-to-br from-accent/[0.08] via-cardSoft/[0.95] to-card'
      : emphasis === 'success'
        ? 'border border-success/[0.20] bg-gradient-to-br from-success/[0.08] via-cardSoft/[0.95] to-card'
        : 'border border-white/5';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-surface p-5 ${emphasisClass} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">{title}</p>
          <p className={`mt-2 font-semibold text-text ${emphasis === 'primary' ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {right}
      </div>
    </motion.div>
  );
}
