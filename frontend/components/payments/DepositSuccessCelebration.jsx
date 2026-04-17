'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Sparkles, Wallet } from 'lucide-react';
import { currency } from '@/lib/utils/format';

const AUTO_CLOSE_MS = 4200;
const STORAGE_PREFIX = 'hope.deposit.success.';

function buildConfetti() {
  const palette = ['#22c55e', '#86efac', '#34d399', '#facc15', '#ffffff'];
  return Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: `${6 + ((index * 13) % 84)}%`,
    delay: `${(index % 6) * 0.06}s`,
    duration: `${1.4 + (index % 4) * 0.18}s`,
    rotate: `${(index * 31) % 360}deg`,
    color: palette[index % palette.length]
  }));
}

function getStorageKey(id) {
  return `${STORAGE_PREFIX}${id}`;
}

export function hasSeenDepositSuccess(id) {
  if (typeof window === 'undefined' || !id) return false;
  return window.sessionStorage.getItem(getStorageKey(id)) === '1';
}

export function markDepositSuccessSeen(id) {
  if (typeof window === 'undefined' || !id) return;
  window.sessionStorage.setItem(getStorageKey(id), '1');
}

export function isDepositSuccessStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return ['confirmed', 'finished', 'paid', 'completed'].includes(normalized);
}

export function DepositSuccessCelebration({ open, paymentId, amount = 0, onClose, walletHref = '/wallet' }) {
  const [visible, setVisible] = useState(open);
  const confettiPieces = useMemo(() => buildConfetti(), []);

  useEffect(() => {
    setVisible(open);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const timer = window.setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, AUTO_CLOSE_MS);

    return () => window.clearTimeout(timer);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(2,6,23,0.72)] px-4"
        >
          <button
            type="button"
            aria-label="Close deposit success message"
            className="absolute inset-0"
            onClick={() => {
              setVisible(false);
              onClose?.();
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(14,20,18,0.98),rgba(7,12,11,0.98))] p-5 text-white shadow-[0_30px_80px_rgba(0,0,0,0.5),0_0_50px_rgba(34,197,94,0.14)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.12),transparent_26%)]" />
            <div className="pointer-events-none absolute -right-10 top-0 h-28 w-28 rounded-full bg-emerald-400/18 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 bottom-0 h-28 w-28 rounded-full bg-emerald-300/12 blur-3xl" />

            <div className="relative text-center">
              <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/12 text-emerald-300 shadow-[0_0_30px_rgba(34,197,94,0.18)]">
                <CheckCircle2 size={30} />
              </div>
              <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-emerald-200/78">Deposit Successful</p>
              <h3 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-white">Congratulations!</h3>
              <p className="mt-3 text-sm leading-6 text-emerald-50/88">
                Your deposit has been successfully credited to your account.
              </p>

              <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/70">Amount added to your wallet</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">{currency(amount)}</p>
                <p className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-100/75">
                  <Sparkles size={14} />
                  You are now ready to explore and grow your income
                </p>
              </div>

              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/42">Hope International Team</p>
            </div>

            <div className="relative mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href={walletHref}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#22c55e,#16a34a)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(34,197,94,0.24)]"
              >
                <Wallet size={16} />
                View Wallet
              </Link>
              <button
                type="button"
                onClick={() => {
                  setVisible(false);
                  onClose?.();
                }}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-white/12 bg-white/6 px-4 py-3 text-sm font-semibold text-white/88"
              >
                Close
              </button>
            </div>

            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {confettiPieces.map((piece) => (
                <span
                  key={`${paymentId || 'deposit'}-${piece.id}`}
                  className="deposit-success-confetti absolute top-0 h-3 w-2 rounded-full opacity-90"
                  style={{
                    left: piece.left,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                    background: piece.color,
                    transform: `rotate(${piece.rotate})`
                  }}
                />
              ))}
            </div>

            <style jsx>{`
              .deposit-success-confetti {
                animation-name: depositSuccessConfetti;
                animation-timing-function: ease-out;
                animation-iteration-count: 1;
                animation-fill-mode: both;
              }

              @keyframes depositSuccessConfetti {
                0% {
                  opacity: 0;
                  transform: translate3d(0, -18px, 0) rotate(0deg);
                }
                12% {
                  opacity: 1;
                }
                100% {
                  opacity: 0;
                  transform: translate3d(0, 220px, 0) rotate(280deg);
                }
              }
            `}</style>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
