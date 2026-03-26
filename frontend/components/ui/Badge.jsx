import clsx from 'clsx';

export function Badge({ children, variant = 'default' }) {
  const classes = {
    default: 'bg-white/10 text-text',
    success: 'bg-success/20 text-success',
    danger: 'bg-danger/20 text-danger',
    accent: 'bg-accent/20 text-accentSoft'
  };

  return <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', classes[variant])}>{children}</span>;
}
