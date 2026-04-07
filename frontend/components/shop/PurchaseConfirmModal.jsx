'use client';

import { AlertCircle, CreditCard, Package2, Wallet } from 'lucide-react';
import { currency } from '@/lib/utils/format';

export function PurchaseConfirmModal({
  open,
  product,
  paymentSourceLabel = 'Spendable Wallet',
  availableBalance = 0,
  payableAmount = 0,
  canAfford = true,
  loading = false,
  onClose,
  onConfirm
}) {
  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close purchase confirmation"
        className="absolute inset-0"
        onClick={() => {
          if (!loading) onClose?.();
        }}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#1f2128_0%,#16181d_100%)] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-[rgba(14,165,233,0.18)] blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[rgba(34,197,94,0.12)] blur-3xl" />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Confirm Purchase</p>
          <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-white">Review before buying</h3>
          <p className="mt-1 text-[13px] text-slate-400">Your order will be placed only after you confirm this payment.</p>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sky-300">
                  <Package2 size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Product</p>
                  <p className="mt-1 text-[15px] font-semibold text-white">{product.name || 'Product'}</p>
                  <p className="mt-1 text-[12px] text-slate-400">Price: {currency(payableAmount)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <CreditCard size={14} />
                  <p className="text-[11px] uppercase tracking-[0.18em]">Payment Source</p>
                </div>
                <p className="mt-2 text-[15px] font-semibold text-white">{paymentSourceLabel}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <Wallet size={14} />
                  <p className="text-[11px] uppercase tracking-[0.18em]">Available Balance</p>
                </div>
                <p className="mt-2 text-[15px] font-semibold text-white">{currency(availableBalance)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Final Payable Amount</p>
                  <p className="mt-1 text-[24px] font-semibold text-white">{currency(payableAmount)}</p>
                </div>
                {!canAfford ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-200">
                    <AlertCircle size={12} />
                    Insufficient balance
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={loading}
              className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm?.()}
              disabled={loading || !canAfford}
              className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#22c55e)] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_16px_30px_rgba(14,165,233,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Processing...' : 'Confirm Purchase'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
