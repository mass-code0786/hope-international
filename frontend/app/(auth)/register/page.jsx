'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, CreditCard, ShieldCheck, UserPlus } from 'lucide-react';
import Logo from '@/components/common/Logo';
import { COUNTRY_CODE_OPTIONS } from '@/lib/constants/countryCodes';
import { useReferralRegistrationForm } from '@/hooks/useReferralRegistrationForm';
import { extractReferralQueryContext, formatPlacementSideLabel } from '@/lib/utils/referralRegistration';

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const { referralCode: referralPrefill, requestedSide } = useMemo(
    () => extractReferralQueryContext(searchParams),
    [searchParams]
  );
  const {
    form,
    setForm,
    useCustomCode,
    setUseCustomCode,
    error,
    previewLoading,
    previewError,
    referralPreview,
    sponsorName,
    sponsorLocked,
    sideLocked,
    effectivePreferredLeg,
    referralMissing,
    submitRegistration,
    isSubmitting,
    referralRequiredMessage
  } = useReferralRegistrationForm({
    referralPrefill,
    requestedSide
  });

  const hasReferralContext = Boolean(form.referralCode.trim() || referralPrefill);
  const showReferralPreview = hasReferralContext || previewLoading || Boolean(previewError);
  const sponsorDisplayName = sponsorName || referralPreview?.sponsor?.username || form.referralCode.trim() || referralPrefill;

  return (
    <div className="card-surface overflow-hidden p-5 md:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo size={52} className="shrink-0" />
          <div>
            <h1 className="mb-3 mt-1 bg-gradient-to-r from-[#a855f7] to-[#22c55e] bg-clip-text text-[22px] font-extrabold leading-[1.2] tracking-[1px] text-transparent antialiased md:text-[26px]">
              Hope International
            </h1>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft p-3">
          <ShieldCheck size={18} className="text-accent" />
          <p className="mt-3 text-sm font-semibold text-text">Secure registration</p>
          <p className="mt-1 text-xs leading-5 text-muted">Validation and referral placement stay intact.</p>
        </div>
        <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft p-3">
          <UserPlus size={18} className="text-accent" />
          <p className="mt-3 text-sm font-semibold text-text">Instant account access</p>
          <p className="mt-1 text-xs leading-5 text-muted">Create your account and move straight into the live member flow.</p>
        </div>
        <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft p-3 sm:col-span-3 lg:col-span-1">
          <CreditCard size={18} className="text-accent" />
          <p className="mt-3 text-sm font-semibold text-text">Referral-protected signup</p>
          <p className="mt-1 text-xs leading-5 text-muted">Referral code or referral link is mandatory for every registration.</p>
        </div>
      </div>

      {referralMissing ? (
        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">Referral Required</p>
          <h2 className="mt-2 text-lg font-semibold">{referralRequiredMessage}</h2>
          <p className="mt-2 text-sm leading-6 opacity-90">
            Enter a valid sponsor username or referral link to continue. If you arrived from a referral link, it will be filled automatically and kept locked.
          </p>
        </div>
      ) : null}

      {showReferralPreview ? (
        <div className="mt-5 rounded-3xl border border-[var(--hope-border)] bg-cardSoft p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Referral placement</p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-text">{sponsorDisplayName || 'Checking referral'}</h2>
              <p className="mt-1 text-sm text-muted">
                {referralPreview?.sponsor?.username ? `@${referralPreview.sponsor.username}` : (form.referralCode.trim() || referralPrefill || 'Awaiting referral data')}
              </p>
            </div>
            {previewLoading ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--hope-border)] bg-background px-3 py-1 text-xs font-semibold text-muted">
                Checking...
              </span>
            ) : null}
            {!previewLoading && !previewError && effectivePreferredLeg ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={12} /> {formatPlacementSideLabel(effectivePreferredLeg)}
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--hope-border)] bg-background px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Sponsor</p>
              <p className="mt-2 text-sm font-semibold text-text">{sponsorDisplayName || 'Pending referral validation'}</p>
            </div>
            <div className="rounded-2xl border border-[var(--hope-border)] bg-background px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Placement Side</p>
              <p className="mt-2 text-sm font-semibold text-text">{formatPlacementSideLabel(effectivePreferredLeg)}</p>
            </div>
          </div>
          {sponsorLocked ? (
            <p className="mt-4 text-xs text-muted">Referral field is locked because this registration was opened from a referral link.</p>
          ) : null}
          {previewError ? (
            <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-danger dark:border-red-500/20 dark:bg-red-500/10">
              {previewError}
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={submitRegistration} className="mt-6 space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Profile details</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">First Name</span>
              <input className="hope-input" placeholder="Enter first name" required value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
            </label>
            <label className="block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Last Name</span>
              <input className="hope-input" placeholder="Enter last name" required value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
            </label>
            <label className="block space-y-2 sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Username</span>
              <input className="hope-input" placeholder="letters, numbers, underscore" required value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
            </label>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Contact details</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[160px,minmax(0,1fr)]">
            <label className="block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Country Code</span>
              <select
                className="hope-select"
                value={useCustomCode ? 'custom' : form.countryCode}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setUseCustomCode(true);
                    setForm((prev) => ({ ...prev, countryCode: '+' }));
                  } else {
                    setUseCustomCode(false);
                    setForm((prev) => ({ ...prev, countryCode: e.target.value }));
                  }
                }}
              >
                {COUNTRY_CODE_OPTIONS.map((item) => (
                  <option key={`${item.label}-${item.value}`} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Mobile Number</span>
              <input className="hope-input" placeholder="Enter mobile number" required value={form.mobileNumber} onChange={(e) => setForm((p) => ({ ...p, mobileNumber: e.target.value }))} />
            </label>
          </div>

          {useCustomCode ? (
            <label className="mt-3 block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Custom Country Code</span>
              <input className="hope-input" placeholder="e.g. +358" required value={form.countryCode} onChange={(e) => setForm((p) => ({ ...p, countryCode: e.target.value }))} />
            </label>
          ) : null}

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Email</span>
              <input className="hope-input" placeholder="Enter email address" type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </label>
            <label className="block space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Password</span>
              <input className="hope-input" placeholder="Create a secure password" type="password" required value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </label>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Referral details</p>
          <label className="mt-3 block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Referral Link / Referral Code</span>
            <input
              className="hope-input"
              placeholder="username or referral link"
              required
              value={form.referralCode}
              readOnly={sponsorLocked}
              onChange={(e) => setForm((p) => ({ ...p, referralCode: e.target.value }))}
            />
          </label>
          {sponsorLocked ? (
            <p className="mt-2 text-xs text-muted">Locked from the referral link that opened this registration.</p>
          ) : null}
          {sideLocked ? (
            <div className="mt-3 rounded-2xl border border-[var(--hope-border)] bg-cardSoft px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Placement Side</p>
              <p className="mt-2 text-sm font-semibold text-text">{formatPlacementSideLabel(effectivePreferredLeg)}</p>
            </div>
          ) : null}
        </div>

        {error ? <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-danger dark:border-red-500/20 dark:bg-red-500/10">{error}</p> : null}
        <button disabled={isSubmitting || previewLoading} className="hope-button w-full disabled:cursor-not-allowed disabled:opacity-70">
          {isSubmitting ? 'Creating account...' : 'Create Hope account'}
          {!isSubmitting ? <ArrowRight size={16} /> : null}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-accent underline decoration-[var(--hope-accent-soft)] underline-offset-4">Login</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="card-surface p-6 md:p-8" />}>
      <RegisterPageContent />
    </Suspense>
  );
}
