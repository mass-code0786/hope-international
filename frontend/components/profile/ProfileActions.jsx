'use client';

import Link from 'next/link';
import { Copy, Share2, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProfileActions({ referralLink, onLogout }) {
  async function copyReferral() {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied to clipboard');
    } catch (_error) {
      toast.error('Unable to copy referral link');
    }
  }

  async function shareReferral() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Hope International',
          text: 'Join Hope International and Earn While You Shop.',
          url: referralLink
        });
        toast.success('Referral link shared');
        return;
      }

      await navigator.clipboard.writeText(referralLink);
      toast.success('Share not supported here. Link copied instead.');
    } catch (_error) {
      toast.error('Unable to share referral link');
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <button onClick={copyReferral} className="flex items-center justify-center gap-1.5 rounded-2xl border border-[var(--hope-border)] bg-card p-3 text-[11px] font-semibold text-text"><Copy size={14} /> Copy link</button>
      <button onClick={shareReferral} className="flex items-center justify-center gap-1.5 rounded-2xl border border-[var(--hope-border)] bg-card p-3 text-[11px] font-semibold text-text"><Share2 size={14} /> Share</button>
      <Link href="/support" className="flex items-center justify-center rounded-2xl border border-[var(--hope-border)] bg-card p-3 text-[11px] font-semibold text-text">Support</Link>
      <button onClick={onLogout} className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"><LogOut size={14} /> Logout</button>
    </div>
  );
}
