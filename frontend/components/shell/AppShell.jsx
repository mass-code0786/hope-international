'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/shell/BottomNav';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { useAuthStore } from '@/lib/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/services/authService';
import { getSellerMe } from '@/lib/services/sellerService';
import { queryKeys } from '@/lib/query/queryKeys';
import { ProfileSkeleton } from '@/components/ui/PageSkeletons';

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
    staleTime: 30_000,
    onError: () => {
      clearSession();
      router.replace('/login');
    }
  });

  const resolvedUser = meQuery.data ?? user ?? null;

  const sellerQuery = useQuery({
    queryKey: queryKeys.sellerMe,
    queryFn: getSellerMe,
    enabled: hydrated && Boolean(token),
    retry: false,
    staleTime: 30_000
  });

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace('/login');
  }, [hydrated, token, router]);

  const isAuthBootstrapping = !hydrated || (Boolean(token) && meQuery.isLoading && !resolvedUser);

  if (isAuthBootstrapping) {
    return (
      <div className="min-h-screen bg-bg p-3.5 md:p-5">
        <ProfileSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text md:flex">
      <Sidebar user={resolvedUser} sellerActive={Boolean(sellerQuery.data?.canAccessDashboard)} />
      <main className="relative w-full min-w-0 md:overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.08),transparent_30%)] dark:bg-[radial-gradient(circle_at_top,rgba(94,234,212,0.08),transparent_26%)]" />
        <div className="relative mx-auto w-full max-w-7xl p-3.5 pb-24 md:p-5 md:pb-6">
          <Topbar user={resolvedUser} sellerActive={Boolean(sellerQuery.data?.canAccessDashboard)} />
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
