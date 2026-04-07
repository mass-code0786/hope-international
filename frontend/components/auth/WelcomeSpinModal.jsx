'use client';

import { Sparkles } from 'lucide-react';
import { WelcomeSpinWheel } from '@/components/spin/WelcomeSpinWheel';

export function WelcomeSpinModal({ open, status, onClaim, claimPending, onClose, onGoToAuctions, auctionBonusBalance = 0 }) {
  if (!open) return null;

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

          <WelcomeSpinWheel
            status={status}
            claimPending={claimPending}
            onClaim={onClaim}
            onClose={onClose}
            onGoToAuctions={onGoToAuctions}
            auctionBonusBalance={auctionBonusBalance}
          />
        </div>
      </div>
    </div>
  );
}
