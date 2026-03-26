'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProfileSkeleton } from '@/components/ui/PageSkeletons';
import { getMe } from '@/lib/services/authService';
import { queryKeys } from '@/lib/query/queryKeys';
import { canAccessAdminArea } from '@/lib/constants/access';
import { useAuthStore } from '@/lib/store/authStore';

export function AdminShell({ children }) {
  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: getMe, retry: false });
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (meQuery.data) setUser(meQuery.data);
  }, [meQuery.data, setUser]);

  if (meQuery.isLoading) return <ProfileSkeleton />;
  if (meQuery.isError) return <ErrorState message="Unable to verify admin access." onRetry={meQuery.refetch} />;

  if (!canAccessAdminArea(meQuery.data)) {
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
          <AdminTopbar user={meQuery.data} />
          {children}
        </div>
      </main>
    </div>
  );
}
