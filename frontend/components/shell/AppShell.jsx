'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/shell/BottomNav';
import { Sidebar } from '@/components/shell/Sidebar';
import { useAuthStore } from '@/lib/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/services/authService';
import { getSellerAccess } from '@/lib/services/sellerService';
import { queryKeys } from '@/lib/query/queryKeys';
import { ProfileSkeleton } from '@/components/ui/PageSkeletons';
import { isSeller } from '@/lib/constants/access';
import { LoginWelcomeVoice } from '@/components/shell/LoginWelcomeVoice';

const LazyHopeAssistant = dynamic(
  () => import('@/components/shell/HopeAssistant').then((mod) => mod.HopeAssistant),
  { ssr: false }
);

export function AppShell({ children }) {
  const router = useRouter();
  const { token, hydrated, hydrate, setUser, clearSession, user } = useAuthStore();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled: hydrated && Boolean(token),
    retry: false,
    initialData: user || undefined,
    staleTime: 300_000,
    onError: () => {
      clearSession();
      router.replace('/login');
    }
  });

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
    if (meQuery.data) setUser(meQuery.data);
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace('/login');
  }, [hydrated, token, router]);

  const isAuthBootstrapping = !hydrated || (Boolean(token) && meQuery.isLoading && !resolvedUser);
  const sellerActive = sellerRoleAccess || Boolean(sellerAccessQuery.data?.canAccessDashboard);

  if (isAuthBootstrapping) {
    return (
      <div className="min-h-screen bg-bg p-3.5 md:p-5">
        <ProfileSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text md:flex">
      <Sidebar user={resolvedUser} sellerActive={sellerActive} />
      <main className="relative w-full min-w-0 md:overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,61,255,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(50,209,125,0.08),transparent_26%)]" />
        <div className="relative mx-auto w-full max-w-7xl p-3.5 pb-24 md:p-5 md:pb-6">
          <LoginWelcomeVoice username={resolvedUser?.username} />
          {children}
        </div>
      </main>
      <LazyHopeAssistant />
      <BottomNav />
    </div>
  );
}
