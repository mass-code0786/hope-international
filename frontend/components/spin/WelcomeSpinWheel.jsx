'use client';

import { useEffect, useMemo, useState } from 'react';
import { Coins, Sparkles, Trophy } from 'lucide-react';
import { currency } from '@/lib/utils/format';

const SEGMENTS = [0.1, 0.2, 0.3, 0.5, 0.75, 1];
const POINTER_OFFSET_DEG = 90;
const PALETTE = ['#22c55e', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6'];

function buildWheelGradient() {
  const step = 360 / SEGMENTS.length;
  return `conic-gradient(${SEGMENTS.map((_, index) => {
    const start = index * step;
    const end = start + step;
    return `${PALETTE[index % PALETTE.length]} ${start}deg ${end}deg`;
  }).join(', ')})`;
}

function buildWinningGlow(index) {
  if (index < 0) return 'none';
  const step = 360 / SEGMENTS.length;
  const start = index * step;
  const end = start + step;
  return `conic-gradient(from -90deg, transparent 0deg ${start}deg, rgba(255,255,255,0.72) ${start}deg ${end}deg, transparent ${end}deg 360deg)`;
}

function randomSpinTurns() {
  return 1800 + Math.floor(Math.random() * 1801);
}

function buildConfetti() {
  return Array.from({ length: 22 }, (_, index) => ({
    id: index,
    left: `${4 + ((index * 91) % 92)}%`,
    delay: `${(index % 7) * 0.08}s`,
    duration: `${2.6 + (index % 5) * 0.28}s`,
    background: PALETTE[index % PALETTE.length],
    rotate: `${(index * 37) % 360}deg`
  }));
}

export function WelcomeSpinWheel({ status, claimPending, onClose, onGoToAuctions, onClaim, auctionBonusBalance = 0 }) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAwaitingResult, setIsAwaitingResult] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(status?.rewardAmount || null);
  const [winningIndex, setWinningIndex] = useState(status?.rewardAmount ? SEGMENTS.findIndex((entry) => Number(entry) === Number(status.rewardAmount)) : -1);
  const [showResult, setShowResult] = useState(Boolean(status?.claimed));
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [showActions, setShowActions] = useState(Boolean(status?.claimed));
  const confettiPieces = useMemo(() => buildConfetti(), []);
  const wheelGradient = useMemo(() => buildWheelGradient(), []);
  const winningGlow = useMemo(() => buildWinningGlow(winningIndex), [winningIndex]);

  useEffect(() => {
    if (status?.claimed) {
      const amount = Number(status.rewardAmount || rewardAmount || 0);
      setRewardAmount(amount);
      setWinningIndex(SEGMENTS.findIndex((entry) => Number(entry) === amount));
      setShowResult(Boolean(amount));
      setCelebrationActive(false);
      setShowActions(Boolean(amount));
      setIsSpinning(false);
      setIsAwaitingResult(false);
    }
  }, [status, rewardAmount]);

  useEffect(() => {
    if (!showResult) return undefined;

    setCelebrationActive(true);
    const confettiTimer = window.setTimeout(() => setCelebrationActive(false), 3200);
    const actionsTimer = window.setTimeout(() => setShowActions(true), 900);

    return () => {
      window.clearTimeout(confettiTimer);
      window.clearTimeout(actionsTimer);
    };
  }, [showResult]);

  async function handleSpin() {
    if (claimPending || isSpinning || isAwaitingResult || showResult || status?.claimed) return;

    try {
      setIsAwaitingResult(true);
      setIsSpinning(true);
      setShowActions(false);
      setCelebrationActive(false);

      const result = await onClaim();
      const amount = Number(result?.rewardAmount || 0);
      const segmentIndex = Math.max(0, SEGMENTS.findIndex((entry) => Number(entry) === amount));
      const segmentAngle = 360 / SEGMENTS.length;
      const centerAngle = segmentIndex * segmentAngle + segmentAngle / 2;
      const targetAngle = 360 - centerAngle + POINTER_OFFSET_DEG;
      const totalRotation = randomSpinTurns() + targetAngle;

      setRewardAmount(amount);
      setWinningIndex(segmentIndex);
      setIsAwaitingResult(false);
      setRotation((previous) => previous + totalRotation);

      window.setTimeout(() => {
        setIsSpinning(false);
        setShowResult(true);
      }, 4200);
    } catch (_error) {
      setIsAwaitingResult(false);
      setIsSpinning(false);
      setShowActions(false);
      setCelebrationActive(false);
      setShowResult(false);
    }
  }

  return (
    <div className="relative">
      <div className="relative mx-auto mt-6 flex w-full max-w-[320px] items-center justify-center">
        <div className="absolute top-0 z-20 h-0 w-0 -translate-y-3 border-l-[16px] border-r-[16px] border-t-[26px] border-l-transparent border-r-transparent border-t-[#f8fafc] drop-shadow-[0_8px_18px_rgba(255,255,255,0.18)]" />
        <div className="relative h-[308px] w-[308px]">
          <div
            className={`absolute inset-0 rounded-full border-[10px] border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.46)] ${isAwaitingResult ? 'spin-wheel-awaiting' : ''}`}
            style={{
              background: wheelGradient,
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning && !isAwaitingResult ? 'transform 4200ms cubic-bezier(0.12,0.82,0.18,1)' : 'none'
            }}
          >
            <div className="absolute inset-0 rounded-full" style={{ background: winningGlow, opacity: showResult ? 1 : 0, transition: 'opacity 300ms ease' }} />
            <div className="absolute inset-[18px] rounded-full border border-white/10">
              {SEGMENTS.map((amount, index) => {
                const angle = index * (360 / SEGMENTS.length) + (360 / SEGMENTS.length) / 2;
                const active = winningIndex === index && showResult;
                return (
                  <div
                    key={amount}
                    className="absolute left-1/2 top-1/2 origin-center"
                    style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-112px)` }}
                  >
                    <span
                      className={`block -rotate-90 rounded-full px-2.5 py-1 text-xs font-bold tracking-[0.08em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] transition ${active ? 'spin-winning-chip bg-white text-slate-950 shadow-[0_0_28px_rgba(255,255,255,0.55)] scale-110' : 'text-white'}`}
                    >
                      {currency(amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute left-1/2 top-1/2 z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#020617] shadow-[0_16px_36px_rgba(0,0,0,0.58)]">
            <button
              type="button"
              onClick={handleSpin}
              disabled={claimPending || isSpinning || isAwaitingResult || showResult || Boolean(status?.claimed)}
              className="inline-flex h-[74px] w-[74px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#f59e0b,#f97316)] text-slate-950 shadow-[0_12px_28px_rgba(249,115,22,0.34)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-[13px] font-bold tracking-[0.06em]">
                {isSpinning || isAwaitingResult ? '...' : 'Spin Now'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-300">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
          <Coins size={15} className="mx-auto text-emerald-300" />
          <p className="mt-2 font-semibold text-white">Auction-only</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
          <Trophy size={15} className="mx-auto text-amber-300" />
          <p className="mt-2 font-semibold text-white">One-time</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
          <Sparkles size={15} className="mx-auto text-fuchsia-300" />
          <p className="mt-2 font-semibold text-white">{currency(auctionBonusBalance)} bonus</p>
        </div>
      </div>

      {showResult ? (
        <div className="relative mt-6 overflow-hidden rounded-[24px] border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(2,6,23,0.4))] px-4 py-5 text-center shadow-[0_18px_50px_rgba(16,185,129,0.16)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_35%)]" />
          <div className="relative animate-[welcomePrize_520ms_cubic-bezier(0.2,0.8,0.2,1)]">
            <p className="text-3xl font-semibold tracking-[-0.05em] text-white"> Congratulations!</p>
            <p className="mt-2 text-xl font-semibold text-emerald-100">You got {currency(rewardAmount || 0)} Welcome Bonus</p>
            <p className="mt-2 text-sm text-emerald-50/90">Use this bonus in Auctions to start your journey.</p>
            <div className="mx-auto mt-4 max-w-xs rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-left shadow-[0_10px_24px_rgba(0,0,0,0.16)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100/80">Auction Bonus Balance</p>
              <p className="mt-1 text-2xl font-semibold text-white">{currency(auctionBonusBalance)}</p>
            </div>
          </div>

          <div className={`relative mt-5 flex flex-col gap-3 transition duration-300 sm:flex-row ${showActions ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}>
            <button
              type="button"
              onClick={onClose}
              disabled={!showActions}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_26px_rgba(255,255,255,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={onGoToAuctions}
              disabled={!showActions}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(0,0,0,0.14)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Go to Auctions
            </button>
          </div>

          {celebrationActive ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {confettiPieces.map((piece) => (
                <span
                  key={piece.id}
                  className="spin-confetti absolute top-0 h-3 w-2 rounded-full opacity-90"
                  style={{
                    left: piece.left,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                    background: piece.background,
                    transform: `rotate(${piece.rotate})`
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <style jsx>{`
        .spin-wheel-awaiting {
          animation: welcomeSpinIdle 0.9s linear infinite;
        }

        .spin-winning-chip {
          animation: winningPulse 1.15s ease-in-out 3;
        }

        .spin-confetti {
          animation-name: welcomeConfetti;
          animation-timing-function: ease-out;
          animation-iteration-count: 1;
          animation-fill-mode: both;
        }

        @keyframes welcomeSpinIdle {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes welcomePrize {
          0% {
            opacity: 0;
            transform: scale(0.84);
          }
          70% {
            opacity: 1;
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes winningPulse {
          0% {
            box-shadow: 0 0 0 rgba(255, 255, 255, 0.2);
            transform: rotate(-90deg) scale(1);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.72);
            transform: rotate(-90deg) scale(1.14);
          }
          100% {
            box-shadow: 0 0 0 rgba(255, 255, 255, 0.2);
            transform: rotate(-90deg) scale(1.06);
          }
        }

        @keyframes welcomeConfetti {
          0% {
            opacity: 0;
            transform: translate3d(0, -20px, 0) rotate(0deg);
          }
          15% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(0, 240px, 0) rotate(300deg);
          }
        }
      `}</style>
    </div>
  );
}
