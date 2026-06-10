'use client';

import { useEffect } from 'react';
import { LoaderCircle, ShoppingCart, X } from 'lucide-react';

export function HopeMillionairePurchaseModal({ open, amount, isPending = false, onClose, onConfirm }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    if (!isPending) onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="hope-millionaire-purchase-title">
      <button type="button" className="absolute inset-0" aria-label="Close purchase confirmation" onClick={handleClose} disabled={isPending} />
      <section className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-violet-400/30 bg-[linear-gradient(145deg,rgba(8,15,35,0.99),rgba(38,24,72,0.99))] text-white shadow-[0_32px_80px_rgba(2,6,23,0.72)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_36%)]" />
        <div className="relative border-b border-white/10 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="hope-millionaire-purchase-title" className="text-[22px] font-semibold tracking-[-0.04em]">Confirm Purchase</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Are you sure you want to buy the ${amount} Hope Millionaire package?</p>
            </div>
            <button type="button" onClick={handleClose} disabled={isPending} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-slate-200 transition hover:bg-white/10 disabled:opacity-50" aria-label="Close purchase confirmation">
              <X size={17} />
            </button>
          </div>
        </div>
        <div className="relative grid grid-cols-2 gap-3 px-5 py-5">
          <button type="button" onClick={handleClose} disabled={isPending} className="rounded-[16px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => onConfirm?.()} disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#2563eb,#7c3aed)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.3)] transition hover:brightness-110 disabled:opacity-65">
            {isPending ? <LoaderCircle size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
            {isPending ? 'Processing...' : 'Confirm Buy'}
          </button>
        </div>
      </section>
    </div>
  );
}
