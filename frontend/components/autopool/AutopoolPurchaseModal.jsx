'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoaderCircle, ShoppingCart, X } from 'lucide-react';
import { currency } from '@/lib/utils/format';

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
      <p className="text-[12px] font-medium text-slate-300">{label}</p>
      <p className="text-[14px] font-semibold tracking-[-0.03em] text-white">{value}</p>
    </div>
  );
}

export function AutopoolPurchaseModal({ open, amount, isPending = false, onClose, onConfirm }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleClose = () => {
    if (isPending) return;
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] flex items-end bg-[rgba(2,6,23,0.9)] px-3 pb-3 pt-8 backdrop-blur-sm sm:items-center sm:justify-center sm:px-4"
        >
          <button
            type="button"
            aria-label="Close pool purchase confirmation"
            className="absolute inset-0"
            onClick={handleClose}
            disabled={isPending}
          />

          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#121722,#0c1018)] text-white shadow-[0_36px_90px_rgba(0,0,0,0.56)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.12),transparent_24%)]" />

            <div className="relative border-b border-white/8 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-white">Confirm Pool Purchase</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    You are about to buy Global Autopool entry for {currency(amount)}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.05] text-slate-200 transition hover:border-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="Close purchase confirmation"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="relative space-y-3 px-4 py-4">
              <SummaryRow label="Entry Amount" value={currency(amount)} />
              <SummaryRow label="Wallet will be deducted" value={currency(amount)} />
            </div>

            <div className="relative border-t border-white/8 px-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="inline-flex items-center justify-center rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/14 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => onConfirm?.()}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(37,99,235,0.32)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isPending ? <LoaderCircle size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
                  <span>{isPending ? 'Processing...' : 'Confirm Buy'}</span>
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
