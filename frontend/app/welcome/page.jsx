'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Camera, Share2 } from 'lucide-react';
import { RegistrationSummaryCard } from '@/components/auth/RegistrationSummaryCard';
import { useAuthStore } from '@/lib/store/authStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function buildFallbackSummary(user) {
  if (!user) return null;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || 'Hope Member';
  const sponsorName = [user.sponsor_first_name, user.sponsor_last_name].filter(Boolean).join(' ').trim() || user.sponsor_username || 'Unassigned';
  const appUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  return {
    fullName,
    username: user.username || '',
    memberId: user.member_id || user.id || '',
    sponsorName,
    sponsorUsername: user.sponsor_username || '',
    placementSide: user.placement_side || 'Pending',
    email: user.email || '',
    mobileNumber: [user.country_code, user.mobile_number].filter(Boolean).join(' '),
    registrationDate: user.created_at || new Date().toISOString(),
    role: user.role || 'user',
    loginUsername: user.username || '',
    accountStatus: user.is_active === false ? 'Inactive' : 'Active',
    referralLink: user.username ? `${appUrl}/register?ref=${encodeURIComponent(user.username)}` : ''
  };
}

export default function WelcomePage() {
  const { hydrated, hydrate, token, registrationSummary } = useAuthStore();
  const clearRegistrationSummary = useAuthStore((s) => s.clearRegistrationSummary);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const meQuery = useCurrentUser({ enabled: Boolean(token) && !registrationSummary });

  const summary = useMemo(() => registrationSummary || buildFallbackSummary(meQuery.data), [registrationSummary, meQuery.data]);

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(217,119,6,0.14),transparent_24%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(236,243,248,0.9))] dark:bg-[radial-gradient(circle_at_top_left,rgba(94,234,212,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_24%),linear-gradient(180deg,rgba(7,16,25,0.98),rgba(10,19,29,0.98))]" />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-3 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--hope-border)] bg-card px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            <Camera size={13} />
            Screenshot-friendly summary
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.06em] text-text sm:text-5xl">Account ready</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-muted sm:text-base">Use this page as the handoff screen for new registrations. It is centered for mobile screenshots and keeps the important member data readable in one frame.</p>
        </div>

        <RegistrationSummaryCard summary={summary} />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <Link href="/shop" onClick={clearRegistrationSummary} className="hope-button">
            Enter marketplace <ArrowRight size={16} />
          </Link>
          <Link href="/profile" onClick={clearRegistrationSummary} className="hope-button-secondary">
            <Share2 size={16} /> Open profile
          </Link>
        </div>
      </div>
    </div>
  );
}
