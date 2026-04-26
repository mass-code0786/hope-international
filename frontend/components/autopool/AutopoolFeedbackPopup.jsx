'use client';

import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

const CONFETTI_PARTICLES = 18;

function buildSuccessMessage(amount) {
  return `Congratulations! Your entry completed in $${Number(amount || 0)} autopool`;
}

function buildErrorMessage() {
  return 'Insufficient balance. Please add funds.';
}

function buildConfettiPieces() {
  return Array.from({ length: CONFETTI_PARTICLES }, (_, index) => ({
    id: index,
    left: 6 + ((index * 91) % 88),
    delay: (index % 6) * 0.12,
    duration: 2.8 + ((index * 17) % 5) * 0.18,
    rotate: -32 + ((index * 29) % 64),
    colorClassName: [
      'bg-[#f59e0b]',
      'bg-[#34d399]',
      'bg-[#38bdf8]',
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

  const audio = audioRef.current;
  audio.currentTime = 0;
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {});
  }
}

export function AutopoolFeedbackPopup({
  amount = null,
  open = false,
  variant = 'success',
  durationMs = 20_000,
  onClose
}) {
  const autoCloseTimerRef = useRef(null);
  const audioRef = useRef(null);
  const audioAvailabilityRef = useRef(null);
  const confettiPieces = useMemo(() => buildConfettiPieces(), []);

  useEffect(() => {
    if (!open) return undefined;

    let isCancelled = false;

    autoCloseTimerRef.current = setTimeout(() => {
      onClose?.();
    }, durationMs);

    if (variant === 'success') {
      playSuccessAudio(audioRef, audioAvailabilityRef).catch(() => {
        if (!isCancelled) {
          audioAvailabilityRef.current = false;
        }
      });
    }

    return () => {
      isCancelled = true;
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [durationMs, onClose, open, variant]);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const isSuccess = variant === 'success';
  const title = isSuccess ? 'Autopool Entry Confirmed' : 'Purchase Unavailable';
  const message = isSuccess ? buildSuccessMessage(amount) : buildErrorMessage();
  const iconClassName = isSuccess
    ? 'bg-emerald-400/18 text-emerald-200'
    : 'bg-amber-400/18 text-amber-200';
  const panelClassName = isSuccess
    ? 'border-emerald-400/20 bg-[linear-gradient(180deg,rgba(5,46,33,0.94),rgba(9,17,26,0.94))]'
    : 'border-amber-400/18 bg-[linear-gradient(180deg,rgba(60,33,6,0.94),rgba(18,16,24,0.94))]';
  const glowClassName = isSuccess
    ? 'bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_28%)]'
    : 'bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(248,113,113,0.16),transparent_28%)]';
  const eyebrowClassName = isSuccess ? 'text-emerald-100/80' : 'text-amber-100/80';

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[95] flex items-start justify-center px-4 pt-5 sm:pt-8"
        >
          <motion.section
            initial={{ opacity: 0, y: -18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.96 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className={`pointer-events-auto relative w-full max-w-lg overflow-hidden rounded-[32px] border p-[1px] shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl ${panelClassName}`}
            role="status"
            aria-live="polite"
          >
            <div className={`absolute inset-0 ${glowClassName}`} />

            {isSuccess ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 overflow-hidden">
                {confettiPieces.map((piece) => (
                  <motion.span
                    key={piece.id}
                    initial={{ opacity: 0, y: -18, rotate: 0 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [0, 18, 84, 150], rotate: [0, piece.rotate, piece.rotate * 1.8] }}
                    transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeOut' }}
                    className={`absolute top-0 h-3 w-1.5 rounded-full ${piece.colorClassName}`}
                    style={{ left: `${piece.left}%` }}
                  />
                ))}
              </div>
            ) : null}

            <div className="relative rounded-[31px] border border-white/10 bg-[rgba(6,10,18,0.72)] px-4 py-4 sm:px-5">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/10 ${iconClassName}`}>
                  {isSuccess ? <CheckCircle2 size={24} /> : <AlertTriangle size={22} />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.26em] ${eyebrowClassName}`}>
                    {isSuccess ? 'Purchase Success' : 'Balance Required'}
                  </p>
                  <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.04em] text-white sm:text-[20px]">{title}</h2>
                  <p className="mt-2 max-w-[32rem] text-sm leading-6 text-slate-200 sm:text-[15px]">
                    {message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onClose?.()}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition hover:bg-white/[0.09] hover:text-white"
                  aria-label="Close autopool feedback popup"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
