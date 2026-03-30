'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Copy, Download, Printer, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { dateTime } from '@/lib/utils/format';

function Field({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className={`mt-2 break-words text-sm font-medium text-text ${mono ? 'font-mono text-[13px]' : ''}`}>{value || 'Not available'}</p>
    </div>
  );
}

async function copyText(text, successMessage) {
  if (!text) {
    toast.error('Nothing to copy');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch (_error) {
    toast.error('Copy failed');
  }
}

export function RegistrationSummaryCard({ summary }) {
  const detailText = useMemo(() => {
    if (!summary) return '';
    return [
      `Full Name: ${summary.fullName || '-'}`,
      `Username: ${summary.username || '-'}`,
      `Member ID: ${summary.memberId || '-'}`,
      `Sponsor Name: ${summary.sponsorName || '-'}`,
      `Sponsor Username: ${summary.sponsorUsername || '-'}`,
      `Placement Side: ${summary.placementSide || '-'}`,
      `Email: ${summary.email || '-'}`,
      `Mobile Number: ${summary.mobileNumber || '-'}`,
      `Registration Date: ${dateTime(summary.registrationDate)}`,
      `Role: ${summary.role || '-'}`,
      `Login Username: ${summary.loginUsername || '-'}`,
      `Account Status: ${summary.accountStatus || '-'}`,
      `Referral Link: ${summary.referralLink || '-'}`
    ].join('\n');
  }, [summary]);

  if (!summary) {
    return (
      <div className="card-surface p-6 text-center">
        <p className="text-lg font-semibold text-text">Registration summary not found</p>
        <p className="mt-2 text-sm leading-6 text-muted">The account was created, but the summary payload is not available in this session. You can still open your profile and copy your referral details there.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/profile" className="hope-button-secondary">Open profile</Link>
          <Link href="/shop" className="hope-button">Enter Hope</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface relative overflow-hidden p-5 sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(135deg,rgba(15,118,110,0.16),rgba(217,119,6,0.08),transparent)]" />
      <div className="relative">
        <div className="flex flex-col items-center text-center">
          <span className="hope-kicker"><Sparkles size={12} /> Registration complete</span>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-text sm:text-[2.35rem]">Save your Hope member details</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted">Take a screenshot or copy the details below before closing this page. These details are the fastest way to share login and referral information with the new member.</p>
        </div>

        <div className="mt-6 rounded-[28px] border border-emerald-200/70 bg-emerald-50/80 p-4 text-center text-sm font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          <div className="flex items-center justify-center gap-2"><ShieldCheck size={16} /> Save or screenshot this confirmation now.</div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Field label="Full Name" value={summary.fullName} />
          <Field label="Username" value={summary.username} mono />
          <Field label="User ID / Member ID" value={summary.memberId} mono />
          <Field label="Sponsor Name" value={summary.sponsorName} />
          <Field label="Sponsor Username / Referral Code" value={summary.sponsorUsername} mono />
          <Field label="Placement Side" value={summary.placementSide} />
          <Field label="Email" value={summary.email} />
          <Field label="Mobile Number" value={summary.mobileNumber} />
          <Field label="Registration Date" value={dateTime(summary.registrationDate)} />
          <Field label="Role / Account Type" value={summary.role} />
          <Field label="Login Username" value={summary.loginUsername} mono />
          <Field label="Account Status" value={summary.accountStatus} />
          <div className="sm:col-span-2">
            <Field label="Referral Link" value={summary.referralLink} mono />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <button onClick={() => copyText(detailText, 'Registration details copied')} className="hope-button-secondary">
            <Copy size={16} /> Copy details
          </button>
          <button onClick={() => copyText(summary.username, 'Username copied')} className="hope-button-secondary">
            <Copy size={16} /> Copy username
          </button>
          <button onClick={() => copyText(summary.referralLink, 'Referral link copied')} className="hope-button-secondary">
            <Download size={16} /> Copy referral link
          </button>
          <button onClick={() => window.print()} className="hope-button">
            <Printer size={16} /> Print / Save
          </button>
        </div>
      </div>
    </div>
  );
}
