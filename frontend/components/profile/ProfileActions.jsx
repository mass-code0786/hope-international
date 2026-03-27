'use client';

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
    <div className="grid grid-cols-2 gap-2.5">
      <button onClick={copyReferral} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-[11px] text-slate-700"><Copy size={14} /> Copy</button>
      <button onClick={shareReferral} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-[11px] text-slate-700"><Share2 size={14} /> Share</button>
      <button className="rounded-xl border border-slate-200 bg-white p-2.5 text-[11px] text-slate-500">KYC Soon</button>
      <button onClick={onLogout} className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-600"><LogOut size={14} /> Logout</button>
    </div>
  );
}
