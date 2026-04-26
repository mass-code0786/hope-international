'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RegistrationSuccess } from '@/components/auth/RegistrationSuccess';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthStore } from '@/lib/store/authStore';
import {
  clearRegistrationSuccessPending,
  hasRegistrationSuccessPending
} from '@/lib/utils/registrationSuccessFlow';

function buildFallbackSummary(user) {
  if (!user) return null;

  const sponsorName = [user.sponsor_first_name, user.sponsor_last_name].filter(Boolean).join(' ').trim();

  return {
    username: user.username || '',
    memberId: user.member_id || user.id || '',
    sponsorName: sponsorName || user.sponsor_username || 'Unassigned',
    sponsorUsername: user.sponsor_username || '',
    email: user.email || ''
  };
}

export default function WelcomePage() {
  const router = useRouter();
  const { hydrated, hydrate, token, registrationSummary } = useAuthStore();
  const clearRegistrationSummary = useAuthStore((state) => state.clearRegistrationSummary);
  const [successPending, setSuccessPending] = useState(false);
  const [flowReady, setFlowReady] = useState(false);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (!hydrated) return;

    if (!token) {
      clearRegistrationSuccessPending();
      clearRegistrationSummary();
      router.replace('/login');
      return;
    }

    const pending = hasRegistrationSuccessPending();
    setSuccessPending(pending);
    setFlowReady(true);
    router.prefetch('/dashboard');

    if (!pending) {
      router.replace('/dashboard');
    }
  }, [clearRegistrationSummary, hydrated, router, token]);

  const meQuery = useCurrentUser({
    enabled: flowReady && successPending && Boolean(token) && !registrationSummary
  });

  const summary = useMemo(
    () => registrationSummary || buildFallbackSummary(meQuery.data),
    [registrationSummary, meQuery.data]
  );

  const handleContinue = () => {
    clearRegistrationSuccessPending();
    clearRegistrationSummary();
    router.replace('/dashboard');
  };

  if (!flowReady || !successPending || !summary) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#050816,#090f1d_46%,#070b14)]" />
    );
  }

  return (
    <RegistrationSuccess
      open={successPending}
      summary={summary}
      onContinue={handleContinue}
    />
  );
}
