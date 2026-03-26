'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ProfileActions } from '@/components/profile/ProfileActions';
import { ProfileSkeleton } from '@/components/ui/PageSkeletons';
import { ErrorState } from '@/components/ui/ErrorState';
import { getMe } from '@/lib/services/authService';
import { queryKeys } from '@/lib/query/queryKeys';
import { useAuthStore } from '@/lib/store/authStore';
import { clearStoredToken } from '@/lib/utils/tokenStorage';
import { rankLabel } from '@/lib/utils/format';
import { isSeller } from '@/lib/constants/access';

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: getMe });
  const clearSession = useAuthStore((s) => s.clearSession);

  if (meQuery.isLoading) return <ProfileSkeleton />;
  if (meQuery.isError) return <ErrorState message="Profile data could not be loaded." onRetry={meQuery.refetch} />;

  const user = meQuery.data || {};
  const referralLink = useMemo(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${appUrl}/register?ref=${user.id || ''}`;
  }, [user.id]);

  async function onLogout() {
    clearStoredToken();
    clearSession();
    await queryClient.clear();
    toast.success('Logged out successfully');
    router.push('/login');
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Profile" subtitle="Account, referral and settings" />
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="Username" value={user.username || '-'} subtitle={`User ID: ${user.id || '-'}`} />
        <StatCard title="Rank" value={rankLabel(user.rank_name)} subtitle={`Sponsor: ${user.sponsor_id || 'N/A'}`} />
        <StatCard title="Referral Link" value="Share and earn 5% direct income" subtitle={referralLink} className="md:col-span-2" />
        <div className="card-surface p-4 md:col-span-2">
          <p className="text-sm text-muted">QR Code Section (Placeholder)</p>
          <div className="mt-3 h-32 w-32 rounded-xl bg-white/5" />
        </div>
        <StatCard
          title="Seller Console"
          value={isSeller(user) ? 'Seller Account Active' : 'Become a Seller'}
          subtitle={isSeller(user) ? 'Manage catalog and moderation status' : 'Apply to sell products on Hope International'}
          className="md:col-span-2"
          right={
            <Link
              href={isSeller(user) ? '/seller' : '/seller/apply'}
              className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-black"
            >
              {isSeller(user) ? 'Open Seller Hub' : 'Apply'}
            </Link>
          }
        />
      </div>
      <ProfileActions referralLink={referralLink} onLogout={onLogout} />
    </div>
  );
}
