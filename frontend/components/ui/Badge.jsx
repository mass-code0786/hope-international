import clsx from 'clsx';

export function Badge({ children, variant = 'default' }) {
  const classes = {
    default: 'border-slate-200 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
    accent: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200'
  };

  return <span className={clsx('inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]', classes[variant])}>{children}</span>;
}
