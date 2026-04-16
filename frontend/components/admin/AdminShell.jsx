'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { ErrorState } from '@/components/ui/ErrorState';
import { getMe } from '@/lib/services/authService';
import { queryKeys } from '@/lib/query/queryKeys';
import { canAccessAdminArea } from '@/lib/constants/access';
import { useAuthStore } from '@/lib/store/authStore';
import { clearStoredToken } from '@/lib/utils/tokenStorage';
import { LoginWelcomeVoice } from '@/components/shell/LoginWelcomeVoice';
import { clearProtectedQueries } from '@/lib/utils/logout';

export function AdminShell({ children }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { token, hydrated, hydrate, user, setUser, clearSession, isLoggingOut } = useAuthStore();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled: hydrated && Boolean(token) && !user,
    retry: false,
    initialData: user || undefined,
    initialDataUpdatedAt: user ? Date.now() : undefined,
    staleTime: 30_000
  });

  const resolvedUser = meQuery.data ?? user ?? null;

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace('/login');
    }
  }, [hydrated, token, router]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!meQuery.isError || resolvedUser) return;
    if (meQuery.error?.status === 401 || meQuery.error?.status === 403) {
      clearStoredToken();
      clearSession();
      router.replace('/login');
    }
  }, [clearSession, meQuery.error, meQuery.isError, resolvedUser, router]);

  async function onLogout() {
    clearStoredToken();
    clearSession({ loggingOut: true });
    setMobileMenuOpen(false);
    await clearProtectedQueries(queryClient);
    toast.success('Logged out successfully');
    router.replace('/login');
  }

  const isHydrating = !hydrated;
  const isAuthBootstrapping = hydrated && Boolean(token) && meQuery.isPending && !resolvedUser;

  if (isLoggingOut) return null;
  if (isHydrating || isAuthBootstrapping) return null;
  if (!token) return null;
  if (token && meQuery.isError && !resolvedUser) return <ErrorState message="Unable to verify admin access." onRetry={meQuery.refetch} />;

  if (!canAccessAdminArea(resolvedUser)) {
    return (
      <div className="mx-auto mt-10 max-w-2xl">
        <ErrorState message="You are not authorized to access admin operations." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text lg:flex">
      <AdminSidebar user={resolvedUser} mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="relative w-full min-w-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(94,234,212,0.1),transparent_24%)]" />
        <div className="relative mx-auto w-full max-w-[1600px] p-4 pb-10 md:p-5">
          <LoginWelcomeVoice username={resolvedUser?.username} />
          <AdminTopbar user={resolvedUser} onLogout={onLogout} onOpenMenu={() => setMobileMenuOpen(true)} />
          {children}
        </div>
      </main>
    </div>
  );
}
