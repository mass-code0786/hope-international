'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const pathname = usePathname();
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

  const isShopRoute = pathname === '/shop' || pathname.startsWith('/shop/');
  const isAuthBootstrapping = !hydrated || (Boolean(token) && meQuery.isLoading && !resolvedUser);

  if (isAuthBootstrapping) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] p-3.5 md:p-5">
        <ProfileSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-text md:flex">
      <Sidebar user={resolvedUser} sellerActive={Boolean(sellerQuery.data?.canAccessDashboard)} />
      <main className="w-full md:overflow-x-hidden">
        <div className={`mx-auto w-full max-w-7xl pb-24 md:p-5 md:pb-6 ${isShopRoute ? 'p-3 md:p-5' : 'p-3.5 md:p-5'}`}>
          {isShopRoute ? null : <Topbar user={resolvedUser} />}
          {children}
        </div>
      </main>
      <BottomNav user={resolvedUser} sellerActive={Boolean(sellerQuery.data?.canAccessDashboard)} />
    </div>
  );
}
