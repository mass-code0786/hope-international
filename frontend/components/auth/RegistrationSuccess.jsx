'use client';

import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, CheckCircle2, ShieldCheck } from 'lucide-react';

const CONFETTI_PARTICLES = 16;

function buildConfettiPieces() {
  return Array.from({ length: CONFETTI_PARTICLES }, (_, index) => ({
    id: index,
    left: 8 + ((index * 83) % 84),
    delay: (index % 4) * 0.13,
    duration: 2.5 + ((index * 19) % 5) * 0.16,
    rotate: -26 + ((index * 31) % 52),
    colorClassName: [
      'bg-[#34d399]',
      'bg-[#38bdf8]',
      'bg-[#f59e0b]',
      'bg-[#f472b6]',
      'bg-white'
    ][index % 5]
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

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className={`mt-2 break-words text-sm font-medium text-white sm:text-[15px] ${mono ? 'font-mono text-[13px] sm:text-[14px]' : ''}`}>
        {value || 'Not available'}
      </p>
    </div>
  );
}

export function RegistrationSuccess({ open = false, summary = null, onContinue }) {
  const audioRef = useRef(null);
  const audioAvailabilityRef = useRef(null);
  const confettiPieces = useMemo(() => buildConfettiPieces(), []);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    playSuccessAudio(audioRef, audioAvailabilityRef).catch(() => {
      if (!cancelled) {
        audioAvailabilityRef.current = false;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

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
          className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_24%),linear-gradient(180deg,#050816,#090f1d_46%,#070b14)] px-4 py-6 sm:px-6 sm:py-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(168,85,247,0.16),transparent_24%),radial-gradient(circle_at_76%_16%,rgba(45,212,191,0.14),transparent_18%),radial-gradient(circle_at_50%_100%,rgba(8,145,178,0.12),transparent_26%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden">
            {confettiPieces.map((piece) => (
              <motion.span
                key={piece.id}
                initial={{ opacity: 0, y: -18, rotate: 0 }}
                animate={{ opacity: [0, 1, 1, 0], y: [0, 26, 90, 150], rotate: [0, piece.rotate, piece.rotate * 1.7] }}
                transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeOut' }}
                className={`absolute top-0 h-3 w-1.5 rounded-full ${piece.colorClassName}`}
                style={{ left: `${piece.left}%` }}
              />
            ))}
          </div>

          <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
            <motion.section
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative w-full max-w-3xl overflow-hidden rounded-[34px] border border-[rgba(94,234,212,0.22)] bg-[linear-gradient(180deg,rgba(8,15,30,0.88),rgba(5,10,22,0.92))] shadow-[0_36px_100px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.04),0_0_42px_rgba(45,212,191,0.12)] backdrop-blur-2xl"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.14),transparent_28%)]" />
              <div className="absolute inset-x-[14%] top-0 h-28 rounded-full bg-[rgba(34,197,94,0.12)] blur-3xl" />

              <div className="relative px-5 py-6 sm:px-8 sm:py-8">
                <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                    <CheckCircle2 size={14} className="text-emerald-300" />
                    Registration Complete
                  </span>

                  <h1 className="mt-5 bg-[linear-gradient(135deg,#f8fafc_0%,#5eead4_42%,#60a5fa_78%,#f0abfc_100%)] bg-clip-text text-3xl font-semibold leading-tight tracking-[-0.06em] text-transparent sm:text-5xl">
                    Congratulations! Your Registration is Successful
                  </h1>

                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                    Your Hope account is ready. Review these details carefully before you continue to the welcome spin.
                  </p>
                </div>

                <div className="mt-6 rounded-[24px] border border-emerald-300/18 bg-emerald-400/8 px-4 py-4 text-center text-sm font-medium text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="flex items-center justify-center gap-2">
                    <Camera size={16} className="text-emerald-300" />
                    Please take a screenshot of this information for future reference.
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <DetailRow label="User ID" value={summary?.memberId} mono />
                  <DetailRow label="Username" value={summary?.username} mono />
                  <DetailRow label="Sponsor ID" value={summary?.sponsorUsername || summary?.sponsorName} mono />
                  <DetailRow label="Email" value={summary?.email} />
                </div>

                <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-7 text-slate-200">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.06] text-emerald-200">
                      <ShieldCheck size={18} />
                    </span>
                    <p>
                      Please keep your password safe and do not share it with anyone.
                    </p>
                  </div>
                </div>

                <div className="mt-7 flex justify-center">
                  <button
                    type="button"
                    onClick={() => onContinue?.()}
                    className="inline-flex min-w-[220px] items-center justify-center rounded-[18px] border border-emerald-300/24 bg-[linear-gradient(135deg,#14b8a6,#2563eb)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(20,184,166,0.22)] transition hover:brightness-110"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </motion.section>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
