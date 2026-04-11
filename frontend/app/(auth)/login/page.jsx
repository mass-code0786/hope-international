'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Fingerprint, LoaderCircle, LockKeyhole, ShieldCheck, Sparkles, User2 } from 'lucide-react';
import { useAuthMutations } from '@/hooks/useAuthMutations';
import toast from 'react-hot-toast';
import Logo from '@/components/common/Logo';
import { useAuthStore } from '@/lib/store/authStore';
import { getWebauthnLoginOptions, verifyWebauthnLogin } from '@/lib/services/authService';
import { getPostLoginRoute } from '@/lib/utils/postLoginRedirect';
import { getWebAuthnAssertion, supportsWebAuthn } from '@/lib/utils/webauthn';
import { getRememberedLoginPreference, getRememberedUsername } from '@/lib/utils/tokenStorage';
import { markWelcomeVoicePending } from '@/lib/utils/welcomeVoice';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const setRememberPreference = useAuthStore((s) => s.setRememberPreference);
  const { loginMutation, refreshCoreQueries, error, setError } = useAuthMutations();
  const [form, setForm] = useState({ username: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [biometricPending, setBiometricPending] = useState(false);

  useEffect(() => {
    setWebauthnSupported(supportsWebAuthn());
    setForm((current) => ({
      ...current,
      username: current.username || getRememberedUsername(),
      rememberMe: getRememberedLoginPreference()
    }));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await loginMutation.mutateAsync(form);
      const user = data?.user || null;
      setRememberPreference(Boolean(form.rememberMe), form.username);
      markWelcomeVoicePending();
      toast.success('Logged in successfully');
      router.push(getPostLoginRoute(user));
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
  }

  async function onBiometricLogin() {
    setError('');

    if (!form.username.trim()) {
      const message = 'Enter your username first to continue with biometrics';
      setError(message);
      toast.error(message);
      return;
    }

    setBiometricPending(true);
    try {
      const optionsResponse = await getWebauthnLoginOptions({ username: form.username.trim() });
      const assertionPayload = await getWebAuthnAssertion(optionsResponse.data || optionsResponse);
      assertionPayload.rememberMe = Boolean(form.rememberMe);
      const data = await verifyWebauthnLogin(assertionPayload);
      setSession({ token: data.token, user: data.user, rememberMe: Boolean(form.rememberMe), username: form.username.trim() });
      setRememberPreference(Boolean(form.rememberMe), form.username);
      await refreshCoreQueries(data.user);
      markWelcomeVoicePending();
      toast.success('Biometric login successful');
      router.push(getPostLoginRoute(data.user));
    } catch (err) {
      const message = err?.message || 'Biometric login failed';
      setError(message);
      toast.error(message);
    } finally {
      setBiometricPending(false);
    }
  }

  return (
    <div className="card-surface relative overflow-hidden p-5 shadow-[0_28px_90px_rgba(15,23,42,0.12)] xl:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[linear-gradient(135deg,rgba(15,118,110,0.18),rgba(217,119,6,0.06),transparent)]" />

      <div className="relative">
        <div className="mb-5 flex justify-between gap-3">
          <span className="hope-kicker"><Sparkles size={14} className="text-accent" /> Secure access</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)] dark:bg-white dark:text-slate-900">
            <ShieldCheck size={14} className="text-emerald-300 dark:text-emerald-600" />
            Trusted portal
          </span>
        </div>

        <div className="mb-7 flex flex-col items-center text-center">
          <Logo size={128} className="mb-1" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Username</span>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--hope-border)] bg-cardSoft px-4 py-3 transition focus-within:border-[color:var(--hope-accent)] focus-within:bg-card">
              <User2 size={18} className="text-muted" />
              <input
                className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
                placeholder="Enter your username"
                required
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--hope-border)] bg-cardSoft px-4 py-3 transition focus-within:border-[color:var(--hope-accent)] focus-within:bg-card">
              <LockKeyhole size={18} className="text-muted" />
              <input
                className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
                placeholder="Enter your password"
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-slate-200/70 hover:text-text dark:hover:bg-white/10"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#141923] px-4 py-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.rememberMe}
              onChange={(e) => setForm((p) => ({ ...p, rememberMe: e.target.checked }))}
              className="h-4 w-4 rounded border-[rgba(255,255,255,0.18)] bg-transparent text-[var(--hope-accent)] focus:ring-[var(--hope-accent)] focus:ring-offset-0"
            />
            <span>Remember me</span>
          </label>

          {error ? <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-danger dark:border-red-500/20 dark:bg-red-500/10">{error}</p> : null}

          <button disabled={loginMutation.isPending} className="hope-button w-full disabled:cursor-not-allowed disabled:opacity-70">
            {loginMutation.isPending ? 'Signing in...' : 'Continue'}
            {!loginMutation.isPending ? <ArrowRight size={16} /> : null}
          </button>

          {webauthnSupported ? (
            <button
              type="button"
              onClick={onBiometricLogin}
              disabled={loginMutation.isPending || biometricPending}
              className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-[rgba(255,255,255,0.12)] bg-[#141923] px-4 py-3 text-sm font-semibold text-white transition hover:border-[rgba(255,255,255,0.2)] hover:bg-[#171d28] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {biometricPending ? <LoaderCircle size={17} className="animate-spin" /> : <Fingerprint size={17} />}
              {biometricPending ? 'Checking device...' : 'Login with Biometrics'}
            </button>
          ) : (
            <p className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#141923] px-4 py-3 text-center text-xs text-muted">
              Biometric login is not available on this browser or device.
            </p>
          )}
        </form>

        <div className="mt-5 flex items-center justify-center gap-3 text-center text-sm text-muted">
          <span className="h-px flex-1 bg-[var(--hope-border)]" />
          <span>No account yet?</span>
          <span className="h-px flex-1 bg-[var(--hope-border)]" />
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          Create your profile to access the marketplace.{' '}
          <Link href="/register" className="font-semibold text-accent underline decoration-[var(--hope-accent-soft)] underline-offset-4 transition hover:opacity-80">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
