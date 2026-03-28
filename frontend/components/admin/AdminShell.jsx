'use client';

import { useEffect } from 'react';
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
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[frontend.admin.shell] denied route reason', { reason: 'getMe failed', hasToken: Boolean(token) });
      }
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
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[frontend.admin.shell] denied route reason', { reason: 'missing token' });
      }
      router.replace('/login');
    }
  }, [hydrated, token, router]);

  useEffect(() => {
    if (!hydrated || !resolvedUser) return;
    if (process.env.NODE_ENV !== 'production') {
      console.info('[frontend.admin.shell] currentUser role', { username: resolvedUser?.username, role: resolvedUser?.role });
    }
  }, [hydrated, resolvedUser]);

  async function onLogout() {
    clearStoredToken();
    clearSession();
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
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[frontend.admin.shell] denied route reason', { reason: 'role not allowed', role: resolvedUser?.role });
    }
    return (
      <div className="mx-auto mt-10 max-w-2xl">
        <ErrorState message="You are not authorized to access admin operations." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text lg:flex">
      <AdminSidebar />
      <main className="w-full">
        <div className="mx-auto w-full max-w-[1600px] p-4 pb-10 md:p-6">
          <AdminTopbar user={resolvedUser} onLogout={onLogout} />
          {children}
        </div>
      </main>
    </div>
  );
}
