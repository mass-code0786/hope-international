'use client';

import { Copy, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

function resolveAppUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function BinaryReferralLinks({ username }) {
  if (!username) return null;

  const appUrl = resolveAppUrl();
  const leftLink = `${appUrl}/register?ref=${encodeURIComponent(username)}&side=left`;
  const rightLink = `${appUrl}/register?ref=${encodeURIComponent(username)}&side=right`;

  async function copyLink(label, value) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch (_error) {
      toast.error(`Unable to copy ${label.toLowerCase()}`);
    }
  }

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.04em] text-text">Referral links</h2>
          <p className="mt-1 text-sm text-muted">Share the exact team side you want new members to join.</p>
        </div>
        <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft p-2 text-accent">
          <Link2 size={16} />
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text">Left Team Link</p>
              <p className="mt-1 break-all text-xs text-muted">{leftLink}</p>
            </div>
            <button type="button" onClick={() => copyLink('Left Team Link', leftLink)} className="hope-button-secondary !px-3 !py-2">
              <Copy size={14} /> Copy
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text">Right Team Link</p>
              <p className="mt-1 break-all text-xs text-muted">{rightLink}</p>
            </div>
            <button type="button" onClick={() => copyLink('Right Team Link', rightLink)} className="hope-button-secondary !px-3 !py-2">
              <Copy size={14} /> Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
