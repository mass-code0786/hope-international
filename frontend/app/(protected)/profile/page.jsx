'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, LogOut, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ProfileActions } from '@/components/profile/ProfileActions';
import { BinaryReferralLinks } from '@/components/referral/BinaryReferralLinks';
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
  const clearSession = useAuthStore((s) => s.clearSession);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const sessionUser = useAuthStore((s) => s.user);

  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: getMe, enabled: hydrated && Boolean(token), retry: false, initialData: sessionUser || undefined });

  const user = meQuery.data ?? sessionUser ?? null;
  const referralLink = useMemo(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const referralCode = user?.username || '';
    return `${appUrl}/register?ref=${encodeURIComponent(referralCode)}`;
  }, [user?.username]);

  async function onLogout() {
    clearStoredToken();
    clearSession();
    await queryClient.clear();
    toast.success('Logged out successfully');
    router.push('/login');
  }

  if (!hydrated || (token && meQuery.isLoading && !user)) return <ProfileSkeleton />;
  if (token && meQuery.isError && !user) return <ErrorState message="Profile data could not be loaded." onRetry={meQuery.refetch} />;
  if (!user) return <ProfileSkeleton />;

  return (
    <div className="space-y-4">
      <SectionHeader title="Profile" subtitle="Account details and referral sharing." />

      <div className="card-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="hope-kicker mb-3"><Sparkles size={12} /> Member summary</span>
            <h3 className="text-2xl font-semibold tracking-[-0.05em] text-text">{[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">Username @{user.username || '-'} | Current rank {rankLabel(user.rank_name)}</p>
          </div>
          <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300"><LogOut size={16} /> Logout</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard compact title="Username" value={user.username || '-'} subtitle={`ID: ${user.id || '-'}`} />
        <StatCard compact title="Rank" value={rankLabel(user.rank_name)} subtitle={`Sponsor: ${user.sponsor_username || user.sponsor_id || 'N/A'}`} />
        <StatCard compact title="Email" value={user.email || '-'} />
        <StatCard compact title="Status" value={user.is_active === false ? 'Inactive' : 'Active'} />
      </div>

      <BinaryReferralLinks username={user?.username} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-text">Seller Console</p>
              <p className="mt-1 text-xs text-muted">{isSeller(user) ? 'Manage catalog and moderation status' : 'Apply to sell products'}</p>
            </div>
            <Link href={isSeller(user) ? '/seller' : '/seller/apply'} className="hope-button-secondary !px-3 !py-2">{isSeller(user) ? 'Open Hub' : 'Apply'}</Link>
          </div>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-text">Auction Hub</p>
              <p className="mt-1 text-xs text-muted">Review bids, winners, and auction history</p>
            </div>
            <Link href="/history/auctions" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">Open <ArrowRight size={15} /></Link>
          </div>
        </div>
      </div>

      <ProfileActions referralLink={referralLink} onLogout={onLogout} />
    </div>
  );
}
