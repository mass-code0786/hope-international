export function ErrorState({ message, onRetry }) {
  return (
    <div className="card-surface border border-danger/30 bg-danger/5 p-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.2em] text-danger/80">Connection Issue</p>
      <p className="mt-2 text-sm text-danger">{message || 'We could not load this section right now.'}</p>
      {onRetry ? (
        <button onClick={onRetry} className="mt-4 rounded-xl border border-danger/40 bg-danger/20 px-4 py-2 text-sm text-danger">
          Try Again
        </button>
      ) : null}
    </div>
  );
}
