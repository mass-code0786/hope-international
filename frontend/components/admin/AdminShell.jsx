'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProfileSkeleton } from '@/components/ui/PageSkeletons';
import { getMe } from '@/lib/services/authService';
import { queryKeys } from '@/lib/query/queryKeys';
import { canAccessAdminArea } from '@/lib/constants/access';
import { useAuthStore } from '@/lib/store/authStore';
import { clearStoredToken } from '@/lib/utils/tokenStorage';

export function AdminShell({ children }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { token, hydrated, hydrate, user, setUser, clearSession } = useAuthStore();

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
      clearStoredToken();
      clearSession();
      router.replace('/login');
    }
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

  async function onLogout() {
    clearStoredToken();
    clearSession();
    setMobileMenuOpen(false);
    await queryClient.clear();
    toast.success('Logged out successfully');
    router.replace('/login');
  }

  const isHydrating = !hydrated;
  const isAuthBootstrapping = hydrated && Boolean(token) && meQuery.isLoading && !resolvedUser;

  if (isHydrating || isAuthBootstrapping) return <ProfileSkeleton />;
  if (!token) return <ProfileSkeleton />;
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
      <AdminSidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="relative w-full min-w-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(94,234,212,0.1),transparent_24%)]" />
        <div className="relative mx-auto w-full max-w-[1600px] p-4 pb-10 md:p-6">
          <AdminTopbar user={resolvedUser} onLogout={onLogout} onOpenMenu={() => setMobileMenuOpen(true)} />
          {children}
        </div>
      </main>
    </div>
  );
}
