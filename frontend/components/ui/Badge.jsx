import clsx from 'clsx';

export function Badge({ children, variant = 'default' }) {
  const classes = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    danger: 'bg-rose-100 text-rose-700',
    accent: 'bg-sky-100 text-sky-700'
  };

  return <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold', classes[variant])}>{children}</span>;
}
