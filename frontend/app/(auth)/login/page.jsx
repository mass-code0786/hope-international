'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  User2,
  UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '@/components/common/Logo';
import { COUNTRY_CODE_OPTIONS } from '@/lib/constants/countryCodes';
import { useAuthMutations } from '@/hooks/useAuthMutations';
import { useReferralRegistrationForm } from '@/hooks/useReferralRegistrationForm';
import { useAuthStore } from '@/lib/store/authStore';
import { getWebauthnLoginOptions, verifyWebauthnLogin } from '@/lib/services/authService';
import { getTeamSummary, getTeamTreeRoot } from '@/lib/services/teamService';
import { queryKeys } from '@/lib/query/queryKeys';
import { extractReferralQueryContext, formatPlacementSideLabel } from '@/lib/utils/referralRegistration';
import { getPostLoginRoute } from '@/lib/utils/postLoginRedirect';
import { getWebAuthnAssertion, supportsWebAuthn } from '@/lib/utils/webauthn';
import { getRememberedLoginPreference, getRememberedUsername } from '@/lib/utils/tokenStorage';
import { markWelcomeVoicePending } from '@/lib/utils/welcomeVoice';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const setRememberPreference = useAuthStore((s) => s.setRememberPreference);
  const { loginMutation, refreshCoreQueries, error, setError } = useAuthMutations();
  const [form, setForm] = useState({ username: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [biometricPending, setBiometricPending] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const { referralCode: referralPrefill, requestedSide } = useMemo(
    () => extractReferralQueryContext(searchParams),
    [searchParams]
  );

  const shouldOpenRegister = useMemo(
    () => searchParams?.get('mode') === 'register' || Boolean(referralPrefill),
    [referralPrefill, searchParams]
  );

  const {
    form: registrationForm,
    setForm: setRegistrationForm,
    useCustomCode,
    setUseCustomCode,
    error: registrationError,
    previewLoading,
    previewError,
    referralPreview,
    sponsorName,
    sponsorLocked,
    sideLocked,
    effectivePreferredLeg,
    referralMissing,
    submitRegistration,
    isSubmitting: registrationSubmitting,
    referralRequiredMessage
  } = useReferralRegistrationForm({
    referralPrefill,
    requestedSide
  });

  useEffect(() => {
    setWebauthnSupported(supportsWebAuthn());
    setForm((current) => ({
      ...current,
      username: current.username || getRememberedUsername(),
      rememberMe: getRememberedLoginPreference()
    }));
  }, []);

  useEffect(() => {
    if (shouldOpenRegister) {
      setAuthMode('register');
    }
  }, [shouldOpenRegister]);

  async function warmPostLoginRoute(route) {
    if (route === '/admin' || route === '/dashboard' || route === '/shop' || route === '/seller') return;

    const tasks = [];

    if (route === '/team') {
      tasks.push(
        queryClient.prefetchQuery({ queryKey: queryKeys.teamSummary, queryFn: getTeamSummary }),
        queryClient.prefetchQuery({ queryKey: queryKeys.teamTreeRoot, queryFn: getTeamTreeRoot })
      );
    }

    await Promise.allSettled(tasks);
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await loginMutation.mutateAsync(form);
      const user = useAuthStore.getState().user || data?.user || null;
      setRememberPreference(Boolean(form.rememberMe), form.username);
      markWelcomeVoicePending();
      const nextRoute = getPostLoginRoute(user);
      router.prefetch(nextRoute);
      await warmPostLoginRoute(nextRoute);
      toast.success('Logged in successfully');
      router.replace(nextRoute);
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
      await setSession({ token: data.token, user: data.user, rememberMe: Boolean(form.rememberMe), username: form.username.trim() });
      setRememberPreference(Boolean(form.rememberMe), form.username);
      const currentUser = await refreshCoreQueries(data.user);
      markWelcomeVoicePending();
      const nextRoute = getPostLoginRoute(currentUser || data.user);
      router.prefetch(nextRoute);
      await warmPostLoginRoute(nextRoute);
      toast.success('Biometric login successful');
      router.replace(nextRoute);
    } catch (err) {
      const message = err?.message || 'Biometric login failed';
      setError(message);
      toast.error(message);
    } finally {
      setBiometricPending(false);
    }
  }

  const hasReferralContext = Boolean(registrationForm.referralCode.trim() || referralPrefill);
  const showReferralPreview = hasReferralContext || previewLoading || Boolean(previewError);
  const sponsorDisplayName =
    sponsorName ||
    referralPreview?.sponsor?.username ||
    registrationForm.referralCode.trim() ||
    referralPrefill;

  return (
    <div className="card-surface relative overflow-hidden p-5 shadow-[0_28px_90px_rgba(15,23,42,0.12)] xl:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[linear-gradient(135deg,rgba(15,118,110,0.18),rgba(217,119,6,0.06),transparent)]" />

      <div className="relative">
        <div className="mb-5 flex justify-between gap-3">
          <span className="hope-kicker">
            {authMode === 'login' ? <Sparkles size={14} className="text-accent" /> : <UserPlus size={14} className="text-accent" />}
            {authMode === 'login' ? 'Secure access' : 'Referral registration'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)] dark:bg-white dark:text-slate-900">
            <ShieldCheck size={14} className="text-emerald-300 dark:text-emerald-600" />
            Trusted portal
          </span>
        </div>

        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={128} className="mb-1" />
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-[22px] border border-[var(--hope-border)] bg-cardSoft p-1.5">
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`rounded-[16px] px-4 py-3 text-sm font-semibold transition ${authMode === 'login' ? 'bg-[linear-gradient(135deg,#7c3aed,#22c55e)] text-white shadow-[0_10px_24px_rgba(124,58,237,0.22)]' : 'text-muted hover:bg-background hover:text-text'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className={`rounded-[16px] px-4 py-3 text-sm font-semibold transition ${authMode === 'register' ? 'bg-[linear-gradient(135deg,#7c3aed,#22c55e)] text-white shadow-[0_10px_24px_rgba(124,58,237,0.22)]' : 'text-muted hover:bg-background hover:text-text'}`}
          >
            Registration
          </button>
        </div>

        {authMode === 'login' ? (
          <>
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
                    onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
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
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
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
                  onChange={(event) => setForm((current) => ({ ...current, rememberMe: event.target.checked }))}
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

            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[18px] border border-[var(--hope-border)] bg-cardSoft px-4 py-3 text-sm font-semibold text-text transition hover:border-[color:var(--hope-accent)] hover:bg-card"
            >
              Open Registration
              <ArrowRight size={15} />
            </button>

            <p className="mt-3 text-center text-xs leading-6 text-muted">
              Registration is available from a valid referral link or by entering a referral code in the registration tab.
            </p>
          </>
        ) : (
          <div className="space-y-5">
            {referralMissing ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">Referral Required</p>
                <p className="mt-2 text-sm font-semibold">{referralRequiredMessage}</p>
                <p className="mt-2 text-xs leading-6 opacity-90">
                  Enter a valid referral code or open the registration page from a referral link.
                </p>
              </div>
            ) : null}

            {showReferralPreview ? (
              <div className="rounded-3xl border border-[var(--hope-border)] bg-cardSoft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Referral placement</p>
                    <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-text">{sponsorDisplayName || 'Checking referral'}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {referralPreview?.sponsor?.username ? `@${referralPreview.sponsor.username}` : (registrationForm.referralCode.trim() || referralPrefill || 'Awaiting referral data')}
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

            <form onSubmit={submitRegistration} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">First Name</span>
                  <input
                    className="hope-input"
                    placeholder="Enter first name"
                    required
                    value={registrationForm.firstName}
                    onChange={(event) => setRegistrationForm((current) => ({ ...current, firstName: event.target.value }))}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Last Name</span>
                  <input
                    className="hope-input"
                    placeholder="Enter last name"
                    required
                    value={registrationForm.lastName}
                    onChange={(event) => setRegistrationForm((current) => ({ ...current, lastName: event.target.value }))}
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Username</span>
                <input
                  className="hope-input"
                  placeholder="letters, numbers, underscore"
                  required
                  value={registrationForm.username}
                  onChange={(event) => setRegistrationForm((current) => ({ ...current, username: event.target.value }))}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-[150px,minmax(0,1fr)]">
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Country Code</span>
                  <select
                    className="hope-select"
                    value={useCustomCode ? 'custom' : registrationForm.countryCode}
                    onChange={(event) => {
                      if (event.target.value === 'custom') {
                        setUseCustomCode(true);
                        setRegistrationForm((current) => ({ ...current, countryCode: '+' }));
                      } else {
                        setUseCustomCode(false);
                        setRegistrationForm((current) => ({ ...current, countryCode: event.target.value }));
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
                  <input
                    className="hope-input"
                    placeholder="Enter mobile number"
                    required
                    value={registrationForm.mobileNumber}
                    onChange={(event) => setRegistrationForm((current) => ({ ...current, mobileNumber: event.target.value }))}
                  />
                </label>
              </div>

              {useCustomCode ? (
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Custom Country Code</span>
                  <input
                    className="hope-input"
                    placeholder="e.g. +358"
                    required
                    value={registrationForm.countryCode}
                    onChange={(event) => setRegistrationForm((current) => ({ ...current, countryCode: event.target.value }))}
                  />
                </label>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Email</span>
                  <input
                    className="hope-input"
                    placeholder="Enter email address"
                    type="email"
                    required
                    value={registrationForm.email}
                    onChange={(event) => setRegistrationForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Password</span>
                  <input
                    className="hope-input"
                    placeholder="Create a secure password"
                    type="password"
                    required
                    value={registrationForm.password}
                    onChange={(event) => setRegistrationForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Referral Link / Referral Code</span>
                <input
                  className="hope-input"
                  placeholder="username or referral link"
                  required
                  value={registrationForm.referralCode}
                  readOnly={sponsorLocked}
                  onChange={(event) => setRegistrationForm((current) => ({ ...current, referralCode: event.target.value }))}
                />
              </label>

              {sponsorLocked ? (
                <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft px-3 py-3 text-xs text-muted">
                  Referral is locked because this page was opened from a referral link.
                </div>
              ) : null}

              {sideLocked ? (
                <div className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Placement Side</p>
                  <p className="mt-2 text-sm font-semibold text-text">{formatPlacementSideLabel(effectivePreferredLeg)}</p>
                </div>
              ) : null}

              {registrationError ? <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-danger dark:border-red-500/20 dark:bg-red-500/10">{registrationError}</p> : null}

              <button disabled={registrationSubmitting || previewLoading} className="hope-button w-full disabled:cursor-not-allowed disabled:opacity-70">
                {registrationSubmitting ? 'Creating account...' : 'Create Hope account'}
                {!registrationSubmitting ? <ArrowRight size={16} /> : null}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card-surface p-6 md:p-8" />}>
      <LoginPageContent />
    </Suspense>
  );
}
