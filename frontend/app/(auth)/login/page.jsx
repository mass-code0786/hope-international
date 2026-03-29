'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, User2 } from 'lucide-react';
import { useAuthMutations } from '@/hooks/useAuthMutations';
import toast from 'react-hot-toast';
import Logo from '@/components/common/Logo';
import { canAccessAdminArea, isSeller } from '@/lib/constants/access';

export default function LoginPage() {
  const router = useRouter();
  const { loginMutation, error, setError } = useAuthMutations();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await loginMutation.mutateAsync(form);
      const user = data?.user || null;
      if (process.env.NODE_ENV !== 'production') {
        console.info('[frontend.login.page] currentUser role', { username: user?.username, role: user?.role });
      }
      toast.success('Logged in successfully');
      if (canAccessAdminArea(user)) {
        router.push('/admin');
        return;
      }
      if (isSeller(user)) {
        router.push('/seller');
        return;
      }
      router.push('/auctions');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur xl:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(34,197,94,0.06),transparent)]" />

      <div className="relative">
        <div className="mb-5 flex justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm">
            <Sparkles size={14} className="text-sky-500" />
            Secure access
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)]">
            <ShieldCheck size={14} className="text-emerald-300" />
            Trusted portal
          </span>
        </div>

        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_32px_rgba(148,163,184,0.18)]">
            <Logo size={58} />
          </div>
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.04em] text-slate-950">Hope International</h1>
          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">Premium marketplace access for members, sellers, and admin operations.</p>
        </div>

        <div className="mb-5 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.82))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Member sign in</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Use your Hope username and password to continue to your dashboard.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Username</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition focus-within:border-sky-300 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(14,165,233,0.12)]">
              <User2 size={18} className="text-slate-400" />
              <input
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Username or email"
                required
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition focus-within:border-sky-300 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(14,165,233,0.12)]">
              <LockKeyhole size={18} className="text-slate-400" />
              <input
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Enter your password"
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error ? <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-danger">{error}</p> : null}

          <button
            disabled={loginMutation.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(15,23,42,0.22)] transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Continue to Hope'}
            {!loginMutation.isPending ? <ArrowRight size={16} /> : null}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">Protected login with role-based access and secure session handling.</p>

        <div className="mt-5 flex items-center justify-center gap-3 text-center text-sm text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          <span>No account yet?</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <p className="mt-4 text-center text-sm text-slate-600">
          Create your profile to access the Hope marketplace.
          {' '}
          <Link href="/register" className="font-semibold text-sky-600 underline decoration-sky-200 underline-offset-4 transition hover:text-sky-700">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
