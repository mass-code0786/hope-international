import { AlertTriangle } from 'lucide-react';

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card-surface border border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,241,242,0.9))] p-6 text-center dark:border-rose-500/20 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(76,5,25,0.24))]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
        <AlertTriangle size={22} />
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-danger/80">Connection Issue</p>
      <p className="mt-2 text-sm leading-6 text-danger">{message || 'We could not load this section right now.'}</p>
      {onRetry ? (
        <button onClick={onRetry} className="mt-5 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          Try Again
        </button>
      ) : null}
    </div>
  );
}
