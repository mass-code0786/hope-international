'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';

const WHEEL_SEGMENTS = [
  { label: '50', value: 50, color: '#7c3aed' },
  { label: '100', value: 100, color: '#22c55e' },
  { label: '250', value: 250, color: '#f59e0b' },
  { label: '500', value: 500, color: '#ec4899' },
  { label: '75', value: 75, color: '#06b6d4' },
  { label: '300', value: 300, color: '#8b5cf6' },
  { label: '150', value: 150, color: '#10b981' },
  { label: '1000', value: 1000, color: '#f97316' }
];

const SLOT_ORDER = ['top', 'right', 'bottom', 'left'];
const HIDDEN_SLOT_LABEL = 'Awaiting reveal';

function hashNameToSlot(name = '') {
  const value = String(name).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return SLOT_ORDER[value % SLOT_ORDER.length];
}

function buildWheelGradient() {
  const slice = 100 / WHEEL_SEGMENTS.length;
  return `conic-gradient(${WHEEL_SEGMENTS.map((segment, index) => {
    const start = Number((index * slice).toFixed(3));
    const end = Number(((index + 1) * slice).toFixed(3));
    return `${segment.color} ${start}% ${end}%`;
  }).join(', ')})`;
}

function buildWinnerSlots(hasRevealedWinner = false, activeWinnerSlot = null, revealedWinner = null) {
  const slots = {
    top: HIDDEN_SLOT_LABEL,
    right: HIDDEN_SLOT_LABEL,
    bottom: HIDDEN_SLOT_LABEL,
    left: HIDDEN_SLOT_LABEL
  };

  if (hasRevealedWinner && activeWinnerSlot && revealedWinner) {
    slots[activeWinnerSlot] = revealedWinner;
  }

  return slots;
}

export function SpinWheelResult({
  winners = [],
  eligible = false,
  revealPending = false,
  onReveal
}) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [hasRevealedWinner, setHasRevealedWinner] = useState(false);
  const [activeWinnerSlot, setActiveWinnerSlot] = useState(null);
  const [revealedWinner, setRevealedWinner] = useState(null);
  const [winningSegment, setWinningSegment] = useState(null);

  useEffect(() => {
    setIsSpinning(false);
    setSpinCount(0);
    setHasRevealedWinner(false);
    setActiveWinnerSlot(null);
    setRevealedWinner(null);
    setWinningSegment(null);
  }, []);

  const winnerSlots = useMemo(
    () => buildWinnerSlots(hasRevealedWinner, activeWinnerSlot, revealedWinner),
    [hasRevealedWinner, activeWinnerSlot, revealedWinner]
  );

  const resultLabel = hasRevealedWinner && revealedWinner ? `Winner: ${revealedWinner}` : 'Spin to reveal winner';

  async function handleSpin() {
    if (!eligible || isSpinning || revealPending) return;

    setIsSpinning(true);
    setWinningSegment(null);
    setHasRevealedWinner(false);
    setActiveWinnerSlot(null);
    setRevealedWinner(null);

    try {
      const result = await onReveal();
      const nextWinners = Array.isArray(result?.data?.winners) && result.data.winners.length ? result.data.winners : winners;
      const winningName = nextWinners[0]?.username || 'Winner';
      const winningSlot = hashNameToSlot(winningName);
      const winningSegmentIndex = Math.abs(
        String(winningName).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
      ) % WHEEL_SEGMENTS.length;
      const segmentAngle = 360 / WHEEL_SEGMENTS.length;
      const rounds = 5;
      const targetRotation = (rounds * 360) + (360 - (winningSegmentIndex * segmentAngle) - (segmentAngle / 2));

      setRotation((current) => current + targetRotation);

      window.setTimeout(() => {
        setHasRevealedWinner(true);
        setRevealedWinner(winningName);
        setActiveWinnerSlot(winningSlot);
        setWinningSegment(winningSegmentIndex);
        setSpinCount((current) => current + 1);
        setIsSpinning(false);
      }, 4200);
    } catch {
      setIsSpinning(false);
    }
  }

  return (
    <section className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] p-4 text-[#FFFFFF] shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">Spin Result</p>
          <h2 className="mt-1 text-[17px] font-semibold text-[#FFFFFF]">Wheel Reveal</h2>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border border-[rgba(255,255,255,0.08)] px-3 py-1 text-[10px] font-semibold ${hasRevealedWinner ? 'bg-[rgba(34,197,94,0.18)] text-[#FFFFFF]' : 'bg-[rgba(20,24,45,0.9)] text-[#B0B3C6]'}`}>
          <Sparkles size={12} />
          {isSpinning ? 'Wheel active' : hasRevealedWinner ? 'Winner ready' : 'Ready to spin'}
        </span>
      </div>

      <div className="mt-5 grid place-items-center">
        <div className="relative h-[320px] w-full max-w-[320px]">
          <div className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 border-l-[12px] border-r-[12px] border-t-[22px] border-l-transparent border-r-transparent border-t-[#fbbf24] drop-shadow-[0_6px_12px_rgba(251,191,36,0.35)]" />

          {SLOT_ORDER.map((slot) => {
            const positionClass = slot === 'top'
              ? 'left-1/2 top-1 -translate-x-1/2'
              : slot === 'right'
                ? 'right-0 top-1/2 -translate-y-1/2'
                : slot === 'bottom'
                  ? 'bottom-0 left-1/2 -translate-x-1/2'
                  : 'left-0 top-1/2 -translate-y-1/2';

            return (
              <div
                key={slot}
                className={`absolute z-20 min-w-[82px] rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[rgba(20,24,45,0.9)] px-3 py-2 text-center shadow-[0_10px_24px_rgba(15,23,42,0.22)] ${positionClass} ${activeWinnerSlot === slot ? 'ring-1 ring-[#22c55e] ring-offset-0' : ''}`}
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#a78bfa]">Winner</p>
                <p className="mt-1 text-[12px] font-semibold text-[#FFFFFF]">{winnerSlots[slot]}</p>
              </div>
            );
          })}

          <div className="absolute inset-[52px] flex items-center justify-center">
            <div className="relative h-[216px] w-[216px] rounded-full bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] p-[10px] shadow-[0_22px_40px_rgba(0,0,0,0.4)]">
              <div
                className="absolute inset-[10px] rounded-full border-[8px] border-[#fef3c7] transition-transform duration-[4200ms] ease-[cubic-bezier(0.12,0.84,0.18,1)]"
                style={{ background: buildWheelGradient(), transform: `rotate(${rotation}deg)` }}
              >
                {WHEEL_SEGMENTS.map((segment, index) => {
                  const angle = (360 / WHEEL_SEGMENTS.length) * index;
                  return (
                    <div
                      key={`${segment.label}-${index}`}
                      className="absolute left-1/2 top-1/2 h-[44%] w-[2px] origin-bottom -translate-x-1/2 -translate-y-full"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      <span
                        className={`absolute left-1/2 top-2 -translate-x-1/2 text-[10px] font-bold text-[#FFFFFF] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] ${winningSegment === index ? 'scale-110' : ''}`}
                        style={{ transform: `rotate(${90 - angle}deg)` }}
                      >
                        {segment.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="absolute inset-[74px] flex items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[radial-gradient(circle_at_top,#4338ca,#111827)] text-center shadow-[inset_0_8px_20px_rgba(255,255,255,0.08)]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B0B3C6]">Prize</p>
                  <p className="mt-1 text-[18px] font-semibold text-[#FFFFFF]">{hasRevealedWinner ? 'Revealed' : 'Spin'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#1A1D2E] px-4 py-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A7F9A]">Result</p>
        <p className="mt-1 text-[16px] font-semibold text-[#FFFFFF]">{resultLabel}</p>
      </div>

      <button
        type="button"
        onClick={handleSpin}
        disabled={isSpinning || revealPending}
        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-4 text-sm font-semibold text-[#FFFFFF] shadow-[0_10px_24px_rgba(124,58,237,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSpinning || revealPending ? 'Spinning...' : spinCount > 0 ? 'Spin Again' : 'Spin Now'}
      </button>
    </section>
  );
}
