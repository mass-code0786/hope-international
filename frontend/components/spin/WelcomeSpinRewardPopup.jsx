'use client';

import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { currency } from '@/lib/utils/format';

const CONFETTI_PARTICLES = 18;

function buildConfettiPieces() {
  return Array.from({ length: CONFETTI_PARTICLES }, (_, index) => ({
    id: index,
    left: 6 + ((index * 89) % 88),
    delay: (index % 6) * 0.11,
    duration: 2.7 + ((index * 17) % 5) * 0.18,
    rotate: -28 + ((index * 27) % 58),
    colorClassName: [
      'bg-[#34d399]',
      'bg-[#38bdf8]',
      'bg-[#f59e0b]',
      'bg-[#f472b6]',
      'bg-[#fde047]',
      'bg-white'
    ][index % 6]
  }));
}

async function playSuccessAudio(audioRef, audioAvailabilityRef) {
  if (typeof window === 'undefined') return;
  if (audioAvailabilityRef.current === false) return;

  if (audioAvailabilityRef.current === null) {
    try {
      const response = await fetch('/sounds/success.mp3', {
        method: 'HEAD',
        cache: 'force-cache'
      });
      audioAvailabilityRef.current = response.ok;
    } catch {
      audioAvailabilityRef.current = false;
    }
  }

  if (!audioAvailabilityRef.current) return;

  if (!audioRef.current) {
    audioRef.current = new Audio('/sounds/success.mp3');
    audioRef.current.preload = 'auto';
  }

  audioRef.current.currentTime = 0;
  const playPromise = audioRef.current.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {});
  }
}

export function WelcomeSpinRewardPopup({
  amount = 0,
  durationMs = 12_000,
  onClose,
  onContinue,
  open = false
}) {
  const autoCloseTimerRef = useRef(null);
  const audioRef = useRef(null);
  const audioAvailabilityRef = useRef(null);
  const confettiPieces = useMemo(() => buildConfettiPieces(), []);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    autoCloseTimerRef.current = setTimeout(() => {
      onClose?.();
    }, durationMs);

    playSuccessAudio(audioRef, audioAvailabilityRef).catch(() => {
      if (!cancelled) {
        audioAvailabilityRef.current = false;
      }
    });

    return () => {
      cancelled = true;
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [durationMs, onClose, open]);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-4 py-6"
        >
          <motion.section
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-[32px] border border-emerald-300/18 bg-[linear-gradient(180deg,rgba(8,15,30,0.9),rgba(5,10,22,0.94))] shadow-[0_34px_100px_rgba(0,0,0,0.52),0_0_0_1px_rgba(255,255,255,0.04),0_0_40px_rgba(45,212,191,0.14)] backdrop-blur-2xl"
            role="status"
            aria-live="polite"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.16),transparent_28%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 overflow-hidden">
              {confettiPieces.map((piece) => (
                <motion.span
                  key={piece.id}
                  initial={{ opacity: 0, y: -18, rotate: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], y: [0, 20, 86, 150], rotate: [0, piece.rotate, piece.rotate * 1.8] }}
                  transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeOut' }}
                  className={`absolute top-0 h-3 w-1.5 rounded-full ${piece.colorClassName}`}
                  style={{ left: `${piece.left}%` }}
                />
              ))}
            </div>

            <div className="relative px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-emerald-400/16 text-emerald-200">
                  <CheckCircle2 size={24} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100/80">
                    <Sparkles size={12} />
                    Reward Unlocked
                  </p>
                  <h2 className="mt-2 bg-[linear-gradient(135deg,#f8fafc_0%,#5eead4_42%,#60a5fa_78%)] bg-clip-text text-2xl font-semibold tracking-[-0.05em] text-transparent sm:text-[28px]">
                    Congratulations!
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-200 sm:text-[15px]">
                    {`Congratulations! You have won ${currency(amount)} bonus.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onClose?.()}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.08] hover:text-white"
                  aria-label="Close reward popup"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    onContinue?.();
                  }}
                  className="inline-flex flex-1 items-center justify-center rounded-[18px] border border-emerald-300/24 bg-[linear-gradient(135deg,#14b8a6,#2563eb)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(20,184,166,0.2)] transition hover:brightness-110"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => onClose?.()}
                  className="inline-flex flex-1 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
                >
                  OK
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
