'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/shell/BottomNav';
import { Sidebar } from '@/components/shell/Sidebar';
import { useAuthStore } from '@/lib/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { getSellerAccess } from '@/lib/services/sellerService';
import { queryKeys } from '@/lib/query/queryKeys';
import { ErrorState } from '@/components/ui/ErrorState';
import { isSeller } from '@/lib/constants/access';
import { LoginWelcomeVoice } from '@/components/shell/LoginWelcomeVoice';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const LazyHopeAssistant = dynamic(
  () => import('@/components/shell/HopeAssistant').then((mod) => mod.HopeAssistant),
  { ssr: false }
);

function ShellLoadingState() {
  return (
    <div className="min-h-screen bg-bg text-text md:flex">
      <aside className="hidden w-80 border-r border-[var(--hope-border)] bg-[linear-gradient(180deg,#1e1f25,#23242b)] p-6 md:block">
        <div className="space-y-4 rounded-[30px] border border-white/10 bg-white/5 p-5">
          <div className="h-5 w-40 rounded-full bg-white/10" />
          <div className="h-16 rounded-[24px] bg-white/5" />
        </div>
      </aside>
      <main className="relative w-full min-w-0">
        <div className="relative mx-auto w-full max-w-7xl p-3.5 pb-24 md:p-5 md:pb-6">
          <div className="space-y-4">
            <div className="h-8 w-40 rounded-full bg-white/10" />
            <div className="rounded-2xl border border-[var(--hope-border)] bg-card p-4">
              <div className="space-y-3">
                <div className="h-4 w-32 rounded-full bg-white/10" />
                <div className="h-3 w-5/6 rounded-full bg-white/5" />
                <div className="h-3 w-2/3 rounded-full bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function AppShell({ children }) {
  const router = useRouter();
  const { token, hydrated, hydrate, clearSession, user, isLoggingOut } = useAuthStore();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const meQuery = useCurrentUser();
  const resolvedUser = meQuery.data ?? user ?? null;
  const sellerRoleAccess = isSeller(resolvedUser);

  const sellerAccessQuery = useQuery({
    queryKey: queryKeys.sellerAccess,
    queryFn: getSellerAccess,
    enabled: hydrated && Boolean(token) && Boolean(resolvedUser) && !sellerRoleAccess,
    retry: false,
    staleTime: 300_000
  });

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace('/login');
  }, [hydrated, token, router]);

  useEffect(() => {
    if (!meQuery.isError || resolvedUser) return;
    if (meQuery.error?.status === 401 || meQuery.error?.status === 403) {
      clearSession();
      router.replace('/login');
    }
  }, [clearSession, meQuery.error, meQuery.isError, resolvedUser, router]);

  const isAuthBootstrapping = !hydrated;
  const sellerActive = sellerRoleAccess || Boolean(sellerAccessQuery.data?.canAccessDashboard);

  if (isLoggingOut) {
    return null;
  }

  if (isAuthBootstrapping) return <ShellLoadingState />;
  if (!token) return <ShellLoadingState />;

  return (
    <div className="min-h-screen bg-bg text-text md:flex">
      <Sidebar user={resolvedUser} sellerActive={sellerActive} />
      <main className="relative w-full min-w-0 md:overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,61,255,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(50,209,125,0.08),transparent_26%)]" />
        <div className="relative mx-auto w-full max-w-7xl p-3.5 pb-24 md:p-5 md:pb-6">
          <LoginWelcomeVoice username={resolvedUser?.username} />
          {token && meQuery.isError && !resolvedUser ? (
            <div className="mb-4">
              <ErrorState message={meQuery.error?.message || 'Unable to fully load your account. Some sections may be limited.'} onRetry={meQuery.refetch} />
            </div>
          ) : null}
          {children}
        </div>
      </main>
      <LazyHopeAssistant />
      <BottomNav />
    </div>
  );
}
