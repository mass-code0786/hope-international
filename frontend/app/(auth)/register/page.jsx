'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthMutations } from '@/hooks/useAuthMutations';
import { LogoFull } from '@/components/brand/HopeLogo';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerMutation, error, setError } = useAuthMutations();
  const [form, setForm] = useState({ username: '', email: '', password: '', sponsorCode: '' });

  useEffect(() => {
    const referral = searchParams.get('ref') || searchParams.get('sponsor') || '';
    if (!referral) {
      return;
    }

    setForm((prev) => {
      if (prev.sponsorCode && prev.sponsorCode !== referral) {
        return prev;
      }

      return {
        ...prev,
        sponsorCode: referral
      };
    });
  }, [searchParams]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    const payload = {
      username: form.username,
      email: form.email,
      password: form.password,
      ...(form.sponsorCode.trim() ? { sponsorCode: form.sponsorCode.trim() } : {})
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
        <LogoFull size={220} />
      </div>
      <p className="mt-4 text-center text-sm text-muted">Start earning with premium products</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="Username" required value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
        <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" placeholder="Referral Code / Sponsor" value={form.sponsorCode} onChange={(e) => setForm((p) => ({ ...p, sponsorCode: e.target.value }))} />
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
