'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthMutations } from '@/hooks/useAuthMutations';
import toast from 'react-hot-toast';
import Logo from '@/components/common/Logo';
import { canAccessAdminArea, isSeller } from '@/lib/constants/access';

export default function LoginPage() {
  const router = useRouter();
  const { loginMutation, error, setError } = useAuthMutations();
  const [form, setForm] = useState({ username: '', password: '' });

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
    <div className="card-surface p-6 md:p-8">
      <div className="mb-6 flex justify-center">
        <div className="rounded-lg bg-white p-2 dark:bg-neutral-900">
          <Logo />
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-slate-600">Username</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
            placeholder="Enter your username or email"
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
