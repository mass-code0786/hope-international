'use client';

import { useEffect, useMemo, useState } from 'react';
import { Coins, Gift, Sparkles, Trophy } from 'lucide-react';
import { currency } from '@/lib/utils/format';

const POINTER_OFFSET_DEG = 90;

function buildWheelGradient(segments) {
  const step = 360 / segments.length;
  const palette = ['#22c55e', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6'];
  const stops = segments.map((_, index) => {
    const start = index * step;
    const end = start + step;
    const color = palette[index % palette.length];
    return `${color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export function WelcomeSpinModal({ open, status, onClaim, claimPending, onClose }) {
  const segments = useMemo(() => ([0.1, 0.2, 0.3, 0.5, 0.75, 1]), []);
  const [rotation, setRotation] = useState(0);
  const [rewardAmount, setRewardAmount] = useState(status?.rewardAmount || null);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    if (!open) {
      setRotation(0);
      setIsSpinning(false);
    }
  }, [open]);

  useEffect(() => {
    if (status?.claimed) {
      setRewardAmount(status.rewardAmount || rewardAmount);
    }
  }, [status, rewardAmount]);

  if (!open) return null;

  const step = 360 / segments.length;
  const wheelGradient = buildWheelGradient(segments);

  async function handleSpin() {
    if (claimPending || isSpinning || status?.claimed || showResult) return;

    try {
      setIsSpinning(true);
      const result = await onClaim();
      const amount = Number(result?.rewardAmount || 0);
      const segmentIndex = Math.max(0, segments.findIndex((entry) => Number(entry) === amount));
      const centerAngle = segmentIndex * step + step / 2;
      const finalRotation = 360 * 6 + (360 - centerAngle + POINTER_OFFSET_DEG);
      setRotation((prev) => prev + finalRotation);
      window.setTimeout(() => {
        setRewardAmount(amount);
        setIsSpinning(false);
      }, 4300);
    } catch (_error) {
      setIsSpinning(false);
    }
  }

  const showResult = Boolean(status?.claimed || rewardAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,6,23,0.82)] px-4 py-6 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.12),transparent_28%),linear-gradient(180deg,#0f172a,#020617)] p-5 text-white shadow-[0_32px_90px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-[rgba(168,85,247,0.22)] blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            <Sparkles size={13} />
            Welcome Bonus
          </div>

          <h2 className="mt-4 text-center text-3xl font-semibold tracking-[-0.05em]">Spin to claim your starting auction bonus</h2>
          <p className="mt-2 text-center text-sm leading-6 text-slate-300">One premium welcome reward, credited to your auction-only balance and ready for entries.</p>

          <div className="relative mx-auto mt-6 flex w-full max-w-[290px] items-center justify-center">
            <div className="absolute top-0 z-10 h-0 w-0 -translate-y-2 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent border-t-[#f8fafc]" />
            <div
              className="relative h-[290px] w-[290px] rounded-full border-[10px] border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.45)] transition-transform duration-[4200ms] ease-[cubic-bezier(0.12,0.82,0.18,1)]"
              style={{ background: wheelGradient, transform: `rotate(${rotation}deg)` }}
            >
              <div className="absolute inset-[18px] rounded-full border border-white/10">
                {segments.map((amount, index) => {
                  const angle = index * step + step / 2;
                  return (
                    <div
                      key={amount}
                      className="absolute left-1/2 top-1/2 origin-center"
                      style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-108px)` }}
                    >
                      <span className="block -rotate-90 text-xs font-bold tracking-[0.08em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
                        {currency(amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#020617] shadow-[0_12px_30px_rgba(0,0,0,0.55)]">
                <Gift size={28} className="text-amber-300" />
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
              <p className="mt-2 font-semibold text-white">$0.10 to $1.00</p>
            </div>
          </div>

          {showResult ? (
            <div className="mt-5 rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Congratulations</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">You won {currency(rewardAmount || 0)}</p>
              <p className="mt-2 text-sm text-emerald-100">Your auction bonus balance has been credited and is ready for auction entries.</p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSpin}
              disabled={claimPending || isSpinning || Boolean(status?.claimed) || showResult}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f59e0b,#f97316)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_28px_rgba(249,115,22,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSpinning ? 'Spinning...' : status?.claimed ? 'Claimed' : 'Spin Now'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={!showResult}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
