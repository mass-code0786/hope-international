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

function buildWinnerSlots(winners = [], selectedSlot = null, selectedWinner = null) {
  const slots = { top: null, right: null, bottom: null, left: null };
  const assigned = new Set();

  winners.slice(0, 4).forEach((winner, index) => {
    const preferredSlot = index === 0
      ? (selectedSlot || hashNameToSlot(winner?.username))
      : SLOT_ORDER.find((slot) => !assigned.has(slot)) || SLOT_ORDER[index % SLOT_ORDER.length];
    slots[preferredSlot] = winner?.username || `Winner ${index + 1}`;
    assigned.add(preferredSlot);
  });

  if (selectedSlot && selectedWinner) {
    slots[selectedSlot] = selectedWinner;
    assigned.add(selectedSlot);
  }

  SLOT_ORDER.forEach((slot, index) => {
    if (!slots[slot]) {
      // TODO: replace placeholder slot labels if backend later provides four explicit winner-side placements.
      slots[slot] = `Winner ${index + 1}`;
    }
  });

  return slots;
}

export function SpinWheelResult({
  winners = [],
  alreadyRevealed = false,
  eligible = false,
  revealPending = false,
  onReveal
}) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(alreadyRevealed && winners[0]?.username ? hashNameToSlot(winners[0].username) : null);
  const [selectedWinner, setSelectedWinner] = useState(winners[0]?.username || null);

  useEffect(() => {
    if (alreadyRevealed && winners[0]?.username) {
      setSelectedWinner(winners[0].username);
      setSelectedSlot((current) => current || hashNameToSlot(winners[0].username));
    }
  }, [alreadyRevealed, winners]);

  const winnerSlots = useMemo(
    () => buildWinnerSlots(winners, selectedSlot, selectedWinner),
    [winners, selectedSlot, selectedWinner]
  );

  const resultLabel = selectedWinner ? `Winner: ${selectedWinner}` : 'Spin the wheel to reveal the winner';

  async function handleSpin() {
    if (!eligible || alreadyRevealed || isSpinning || revealPending) return;

    setIsSpinning(true);

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
        setSelectedWinner(winningName);
        setSelectedSlot(winningSlot);
        setIsSpinning(false);
      }, 4200);
    } catch {
      setIsSpinning(false);
    }
  }

  return (
    <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,#141b30,#0f172a)] p-4 text-white shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/70">Spin Result</p>
          <h2 className="mt-1 text-[17px] font-semibold">Wheel Reveal</h2>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold ${selectedWinner ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/8 text-slate-300'}`}>
          <Sparkles size={12} />
          {selectedWinner ? 'Winner locked' : 'Ready to spin'}
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
                className={`absolute z-20 min-w-[82px] rounded-[16px] border px-3 py-2 text-center shadow-[0_10px_24px_rgba(15,23,42,0.22)] ${positionClass} ${selectedSlot === slot ? 'border-emerald-300 bg-emerald-400/18 text-white' : 'border-white/10 bg-[#192339] text-slate-200'}`}
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Winner</p>
                <p className="mt-1 text-[12px] font-semibold">{winnerSlots[slot]}</p>
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
                        className="absolute left-1/2 top-2 -translate-x-1/2 text-[10px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                        style={{ transform: `rotate(${90 - angle}deg)` }}
                      >
                        {segment.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="absolute inset-[74px] flex items-center justify-center rounded-full border border-white/15 bg-[radial-gradient(circle_at_top,#4338ca,#111827)] text-center shadow-[inset_0_8px_20px_rgba(255,255,255,0.08)]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-200/70">Prize</p>
                  <p className="mt-1 text-[18px] font-semibold">{selectedWinner ? 'Revealed' : 'Spin'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Result</p>
        <p className="mt-1 text-[16px] font-semibold text-white">{resultLabel}</p>
      </div>

      <button
        type="button"
        onClick={handleSpin}
        disabled={!eligible || alreadyRevealed || isSpinning || revealPending}
        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(124,58,237,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSpinning || revealPending ? 'Spinning...' : alreadyRevealed ? 'Result Revealed' : 'Spin'}
      </button>
    </section>
  );
}
