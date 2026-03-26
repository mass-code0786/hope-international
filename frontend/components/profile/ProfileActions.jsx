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
    <div className="grid gap-3 md:grid-cols-2">
      <button onClick={copyReferral} className="card-surface flex items-center justify-center gap-2 p-4 text-sm text-text"><Copy size={16} /> Copy Referral</button>
      <button onClick={shareReferral} className="card-surface flex items-center justify-center gap-2 p-4 text-sm text-text"><Share2 size={16} /> Share Referral</button>
      <button className="card-surface p-4 text-sm text-muted">KYC (Coming Soon)</button>
      <button onClick={onLogout} className="card-surface flex items-center justify-center gap-2 p-4 text-sm text-danger"><LogOut size={16} /> Logout</button>
    </div>
  );
}
