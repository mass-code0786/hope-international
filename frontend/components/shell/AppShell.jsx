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
    enabled: Boolean(token),
    retry: false,
    onError: () => {
      clearSession();
      router.replace('/login');
    }
  });

  const sellerQuery = useQuery({
    queryKey: queryKeys.sellerMe,
    queryFn: getSellerMe,
    enabled: Boolean(token),
    retry: false,
    staleTime: 0
  });

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) router.replace('/login');
  }, [hydrated, token, router]);

  const isShopRoute = pathname === '/shop' || pathname.startsWith('/shop/');

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-text md:flex">
      <Sidebar user={user} sellerActive={Boolean(sellerQuery.data?.canAccessDashboard)} />
      <main className="w-full md:overflow-x-hidden">
        <div className={`mx-auto w-full max-w-7xl pb-24 md:p-5 md:pb-6 ${isShopRoute ? 'p-3 md:p-5' : 'p-3.5 md:p-5'}`}>
          {isShopRoute ? null : <Topbar user={user} />}
          {children}
        </div>
      </main>
      <BottomNav user={user} sellerActive={Boolean(sellerQuery.data?.canAccessDashboard)} />
    </div>
  );
}
