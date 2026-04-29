'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Copy, Share2, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { ReferralSideModal } from '@/components/referral/ReferralSideModal';
import { buildReferralLink } from '@/lib/utils/referralLinks';

export function ProfileActions({ referralCode, onLogout }) {
  const [pendingAction, setPendingAction] = useState(null);

  async function copyReferral(link) {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Referral link copied successfully.');
    } catch (_error) {
      toast.error('Unable to copy referral link');
    }
  }

  async function shareReferral(link) {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Hope International',
          text: 'Join my network and start earning',
          url: link
        });
        toast.success('Referral link shared');
        return;
      }

      await navigator.clipboard.writeText(link);
      toast.success('Share not supported here. Link copied instead.');
    } catch (_error) {
      toast.error('Unable to share referral link');
    }
  }

  async function handleSideSelect(side) {
    if (!referralCode) {
      toast.error('Referral code is unavailable');
      setPendingAction(null);
      return;
    }

    const link = buildReferralLink(referralCode, side);
    const action = pendingAction;
    setPendingAction(null);

    if (action === 'copy') {
      await copyReferral(link);
      return;
    }

    if (action === 'share') {
      await shareReferral(link);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <button type="button" onClick={() => setPendingAction('copy')} className="flex items-center justify-center gap-1.5 rounded-2xl border border-[var(--hope-border)] bg-card p-3 text-[11px] font-semibold text-text"><Copy size={14} /> Copy link</button>
        <button type="button" onClick={() => setPendingAction('share')} className="flex items-center justify-center gap-1.5 rounded-2xl border border-[var(--hope-border)] bg-card p-3 text-[11px] font-semibold text-text"><Share2 size={14} /> Share</button>
        <Link href="/support" className="flex items-center justify-center rounded-2xl border border-[var(--hope-border)] bg-card p-3 text-[11px] font-semibold text-text">Support</Link>
        <button type="button" onClick={onLogout} className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"><LogOut size={14} /> Logout</button>
      </div>

      <ReferralSideModal open={Boolean(pendingAction)} onClose={() => setPendingAction(null)} onSelect={handleSideSelect} />
    </>
  );
}
