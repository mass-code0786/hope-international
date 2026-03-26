'use client';

export function ConfirmationModal({ open, title, description, onCancel, onConfirm, confirmText = 'Confirm', loading = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-5">
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-muted">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
