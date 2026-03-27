'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthMutations } from '@/hooks/useAuthMutations';
import { LogoFull } from '@/components/brand/HopeLogo';
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
      router.push('/');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  }

  return (
    <div className="card-surface p-6 md:p-8">
      <div className="flex justify-center">
        <LogoFull size={48} />
      </div>
      <p className="mt-4 text-center text-sm text-muted">Create your account and start sharing your referral username</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-600">First Name</span>
          <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="Enter first name" required value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-600">Last Name</span>
          <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="Enter last name" required value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-600">User Name</span>
          <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="letters, numbers, underscore" required value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
        </label>

        <div className="grid grid-cols-[140px_1fr] gap-2">
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-600">Country Code</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
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

          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-600">Mobile Number</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="Enter mobile number" required value={form.mobileNumber} onChange={(e) => setForm((p) => ({ ...p, mobileNumber: e.target.value }))} />
          </label>
        </div>

        {useCustomCode ? (
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-slate-600">Custom Country Code</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="e.g. +358" required value={form.countryCode} onChange={(e) => setForm((p) => ({ ...p, countryCode: e.target.value }))} />
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-600">Email</span>
          <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="Enter email address" type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-600">Password</span>
          <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="Create a secure password" type="password" required value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-600">Referral Link / Referral Code (Optional)</span>
          <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="username or referral link" value={form.referralCode} onChange={(e) => setForm((p) => ({ ...p, referralCode: e.target.value }))} />
        </label>

        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <button disabled={registerMutation.isPending} className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-black">{registerMutation.isPending ? 'Creating account...' : 'Register'}</button>
      </form>

      <p className="mt-4 text-sm text-muted">Already have an account? <Link href="/login" className="text-accent">Login</Link></p>
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
