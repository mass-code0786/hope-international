'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CreditCard, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthMutations } from '@/hooks/useAuthMutations';
import Logo from '@/components/common/Logo';
import { COUNTRY_CODE_OPTIONS } from '@/lib/constants/countryCodes';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerMutation, error, setError } = useAuthMutations();
  const [useCustomCode, setUseCustomCode] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    mobileNumber: '',
    countryCode: '+44',
    email: '',
    password: '',
    referralCode: ''
  });

  const referralPrefill = useMemo(() => {
    return searchParams.get('ref') || searchParams.get('sponsor') || '';
  }, [searchParams]);

  useEffect(() => {
    if (!referralPrefill) return;
    setForm((prev) => ({ ...prev, referralCode: prev.referralCode || referralPrefill }));
  }, [referralPrefill]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username: form.username.trim(),
      mobileNumber: form.mobileNumber.trim(),
      countryCode: form.countryCode.trim(),
      email: form.email.trim(),
      password: form.password,
      ...(form.referralCode.trim() ? { referralCode: form.referralCode.trim() } : {})
    };

    try {
      await registerMutation.mutateAsync(payload);
      toast.success('Welcome to Hope International');
      router.push('/welcome');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  }

  return (
    <div className="card-surface overflow-hidden p-5 md:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-[22px] bg-white p-2.5 shadow-sm dark:bg-slate-950">
            <Logo size={44} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Create member account</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-text">Join Hope International</h1>
          </div>
        </div>
        <span className="hope-kicker hidden sm:inline-flex"><Sparkles size={12} /> New member</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft p-3">
          <ShieldCheck size={18} className="text-accent" />
          <p className="mt-3 text-sm font-semibold text-text">Secure registration</p>
          <p className="mt-1 text-xs leading-5 text-muted">Validation and referral logic stay unchanged.</p>
        </div>
        <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft p-3">
          <UserPlus size={18} className="text-accent" />
          <p className="mt-3 text-sm font-semibold text-text">Instant account access</p>
          <p className="mt-1 text-xs leading-5 text-muted">New members can review account details immediately after signup.</p>
        </div>
        <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft p-3 sm:col-span-3 lg:col-span-1">
          <CreditCard size={18} className="text-accent" />
          <p className="mt-3 text-sm font-semibold text-text">Referral-ready profile</p>
          <p className="mt-1 text-xs leading-5 text-muted">Share a screenshot of the success card after registration.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
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
            <input className="hope-input" placeholder="username or referral link" value={form.referralCode} onChange={(e) => setForm((p) => ({ ...p, referralCode: e.target.value }))} />
          </label>
        </div>

        {error ? <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-danger dark:border-red-500/20 dark:bg-red-500/10">{error}</p> : null}
        <button disabled={registerMutation.isPending} className="hope-button w-full disabled:cursor-not-allowed disabled:opacity-70">
          {registerMutation.isPending ? 'Creating account...' : 'Create Hope account'}
          {!registerMutation.isPending ? <ArrowRight size={16} /> : null}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-accent underline decoration-[var(--hope-accent-soft)] underline-offset-4">Login</Link></p>
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
