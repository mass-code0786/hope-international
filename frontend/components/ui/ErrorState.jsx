import { AlertTriangle, Clock3, Server, WifiOff } from 'lucide-react';

const ERROR_STATE_VARIANTS = {
  default: {
    label: 'Connection Issue',
    Icon: AlertTriangle,
    badgeClassName: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
    buttonClassName: 'border-rose-200 bg-white text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
  },
  network: {
    label: 'Network Error',
    Icon: WifiOff,
    badgeClassName: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-200',
    buttonClassName: 'border-amber-200 bg-white text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'
  },
  server: {
    label: 'Server Error',
    Icon: Server,
    badgeClassName: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-200',
    buttonClassName: 'border-orange-200 bg-white text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200'
  },
  timeout: {
    label: 'Request Timeout',
    Icon: Clock3,
    badgeClassName: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-200',
    buttonClassName: 'border-sky-200 bg-white text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200'
  }
};

export function ErrorState({ message, onRetry, type = 'default', label }) {
  const variant = ERROR_STATE_VARIANTS[type] || ERROR_STATE_VARIANTS.default;
  const Icon = variant.Icon;
  const eyebrow = label || variant.label;

  return (
    <div className="card-surface border border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,241,242,0.9))] p-6 text-center dark:border-rose-500/20 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(76,5,25,0.24))]">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${variant.badgeClassName}`}>
        <Icon size={22} />
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-danger/80">{eyebrow}</p>
      <p className="mt-2 text-sm leading-6 text-danger">{message || 'We could not load this section right now.'}</p>
      {onRetry ? (
        <button onClick={onRetry} className={`mt-5 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-sm ${variant.buttonClassName}`}>
          Try Again
        </button>
      ) : null}
    </div>
  );
}
