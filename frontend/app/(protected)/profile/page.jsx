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

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied');
    } catch (_error) {
      toast.error('Unable to copy referral link');
    }
  }

  return (
    <div className="space-y-3">
      <SectionHeader title="Profile" subtitle="Account and referral" />

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard compact title="Username" value={user.username || '-'} subtitle={`ID: ${user.id || '-'}`} />
        <StatCard compact title="Rank" value={rankLabel(user.rank_name)} subtitle={`Sponsor: ${user.sponsor_id || 'N/A'}`} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-800">Referral Link</p>
          <button onClick={copyReferralLink} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600">Copy</button>
        </div>
        <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-600 break-all">{referralLink}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-800">Seller Console</p>
            <p className="text-[10px] text-slate-500">{isSeller(user) ? 'Manage catalog and moderation status' : 'Apply to sell products'}</p>
          </div>
          <Link
            href={isSeller(user) ? '/seller' : '/seller/apply'}
            className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white"
          >
            {isSeller(user) ? 'Open Hub' : 'Apply'}
          </Link>
        </div>
      </div>

      <ProfileActions referralLink={referralLink} onLogout={onLogout} />
    </div>
  );
}
