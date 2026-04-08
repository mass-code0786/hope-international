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
    <section className="relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,#181b26_0%,#10131c_100%)] p-4 text-[#FFFFFF] shadow-[0_24px_70px_rgba(0,0,0,0.42)] sm:p-5">
      <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_68%)]" />
      <div className="absolute -left-10 top-24 h-32 w-32 rounded-full bg-[rgba(124,58,237,0.14)] blur-3xl" />
      <div className="absolute -right-8 bottom-10 h-28 w-28 rounded-full bg-[rgba(34,197,94,0.12)] blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#bba6ff]">Spin Result</p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-[#FFFFFF]">Wheel Reveal</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.18)] ${hasRevealedWinner ? 'border-[rgba(74,222,128,0.28)] bg-[rgba(34,197,94,0.16)] text-[#f8fafc]' : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[#c8cedc]'}`}>
          <Sparkles size={12} />
          {isSpinning ? 'Wheel active' : hasRevealedWinner ? 'Winner ready' : 'Ready to spin'}
        </span>
      </div>

      <div className="relative mt-6 grid place-items-center">
        <div className="relative h-[334px] w-full max-w-[334px] sm:h-[356px] sm:max-w-[356px]">
          <div className="absolute left-1/2 top-[14px] z-20 h-0 w-0 -translate-x-1/2 border-l-[11px] border-r-[11px] border-t-[24px] border-l-transparent border-r-transparent border-t-[#f5c96a] drop-shadow-[0_10px_18px_rgba(245,201,106,0.38)] sm:top-[12px]" />
          <div className="absolute left-1/2 top-[8px] z-10 h-9 w-9 -translate-x-1/2 rounded-full border border-[rgba(255,236,179,0.3)] bg-[radial-gradient(circle,#fff1b8_0%,#f5c96a_48%,#8a5b11_100%)] opacity-85 blur-[1px]" />

          {SLOT_ORDER.map((slot) => {
            const positionClass = slot === 'top'
              ? 'left-1/2 top-0 -translate-x-1/2'
              : slot === 'right'
                ? 'right-0 top-1/2 -translate-y-1/2'
                : slot === 'bottom'
                  ? 'bottom-0 left-1/2 -translate-x-1/2'
                  : 'left-0 top-1/2 -translate-y-1/2';

            return (
              <div
                key={slot}
                className={`absolute z-20 min-w-[90px] rounded-[16px] border px-3 py-2 text-center shadow-[0_14px_30px_rgba(0,0,0,0.26)] backdrop-blur-md ${positionClass} ${activeWinnerSlot === slot ? 'border-[rgba(250,204,21,0.45)] bg-[rgba(250,204,21,0.14)] ring-1 ring-[rgba(250,204,21,0.38)]' : 'border-[rgba(255,255,255,0.08)] bg-[rgba(14,18,28,0.76)]'}`}
              >
                <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-[#bba6ff]">Winner</p>
                <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-[#f8fafc]">{winnerSlots[slot]}</p>
              </div>
            );
          })}

          <div className="absolute inset-[54px] flex items-center justify-center sm:inset-[58px]">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.18)_0%,transparent_62%)] blur-2xl" />
            <div className="relative h-[226px] w-[226px] rounded-full bg-[linear-gradient(135deg,#e7b74c_0%,#7c5515_42%,#f5d68a_100%)] p-[11px] shadow-[0_28px_50px_rgba(0,0,0,0.48)] sm:h-[240px] sm:w-[240px]">
              <div className="absolute inset-[2px] rounded-full border border-[rgba(255,237,176,0.28)] opacity-80" />
              <div
                className="absolute inset-[11px] rounded-full border-[9px] border-[rgba(255,244,206,0.75)] transition-transform duration-[4200ms] ease-[cubic-bezier(0.12,0.84,0.18,1)] shadow-[inset_0_6px_18px_rgba(255,255,255,0.14)]"
                style={{ background: buildWheelGradient(), transform: `rotate(${rotation}deg)` }}
              >
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_42%)]" />
                {WHEEL_SEGMENTS.map((segment, index) => {
                  const angle = (360 / WHEEL_SEGMENTS.length) * index;
                  return (
                    <div
                      key={`${segment.label}-${index}`}
                      className="absolute left-1/2 top-1/2 h-[45%] w-[2px] origin-bottom -translate-x-1/2 -translate-y-full"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      <span
                        className={`absolute left-1/2 top-2 -translate-x-1/2 text-[10px] font-bold tracking-[0.03em] text-[#FFFFFF] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transition ${winningSegment === index ? 'scale-110 text-[#fff7d0] drop-shadow-[0_0_16px_rgba(250,204,21,0.55)]' : ''}`}
                        style={{ transform: `rotate(${90 - angle}deg)` }}
                      >
                        {segment.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="absolute inset-[74px] flex items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] bg-[radial-gradient(circle_at_top,#312e81_0%,#11131b_72%)] text-center shadow-[inset_0_10px_24px_rgba(255,255,255,0.08),0_16px_30px_rgba(0,0,0,0.28)] sm:inset-[78px]">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#b8bfd0]">Center Hub</p>
                  <p className="mt-1 text-[18px] font-semibold tracking-[-0.03em] text-[#FFFFFF]">{hasRevealedWinner ? 'Revealed' : 'Spin'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-5 rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-3.5 text-center shadow-[0_16px_34px_rgba(0,0,0,0.22)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8e95a8]">Result</p>
        <p className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-[#FFFFFF]">{resultLabel}</p>
      </div>

      <button
        type="button"
        onClick={handleSpin}
        disabled={isSpinning || revealPending}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-4 text-sm font-semibold text-[#FFFFFF] shadow-[0_14px_28px_rgba(124,58,237,0.34)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSpinning || revealPending ? 'Spinning...' : spinCount > 0 ? 'Spin Again' : 'Spin Now'}
      </button>
    </section>
  );
}
