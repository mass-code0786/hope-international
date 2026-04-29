'use client';

import { useEffect } from 'react';

export function ReferralSideModal({ open, onClose, onSelect }) {
  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:pb-10" role="dialog" aria-modal="true" aria-labelledby="referral-side-title">
      <div className="w-full max-w-sm rounded-[24px] border border-[var(--hope-border)] bg-card p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="referral-side-title" className="text-lg font-semibold tracking-[-0.03em] text-text">Choose Placement Side</h2>
            <p className="mt-1 text-sm leading-5 text-muted">Select where this referral should be placed.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--hope-border)] text-sm font-semibold text-muted" aria-label="Close placement side selection">
            x
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onSelect('left')} className="hope-button-secondary justify-center">
            Left
          </button>
          <button type="button" onClick={() => onSelect('right')} className="hope-button-secondary justify-center">
            Right
          </button>
        </div>
      </div>
    </div>
  );
}
