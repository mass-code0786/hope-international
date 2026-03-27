'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthMutations } from '@/hooks/useAuthMutations';
import toast from 'react-hot-toast';
import { LogoFull } from '@/components/brand/HopeLogo';

export default function LoginPage() {
  const router = useRouter();
  const { loginMutation, error, setError } = useAuthMutations();
  const [form, setForm] = useState({ username: '', password: '' });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await loginMutation.mutateAsync(form);
      toast.success('Logged in successfully');
      router.push('/shop');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
  }

  return (
    <div className="card-surface p-6 md:p-8">
      <div className="flex justify-center">
        <LogoFull size={48} />
      </div>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-600">Username</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
            placeholder="Enter your username"
            required
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-600">Password</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
            placeholder="Enter your password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          />
        </label>

        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <button disabled={loginMutation.isPending} className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-black">{loginMutation.isPending ? 'Signing in...' : 'Login'}</button>
      </form>
      <p className="mt-4 text-sm text-muted">No account? <Link href="/register" className="text-accent">Create one</Link></p>
    </div>
  );
}
