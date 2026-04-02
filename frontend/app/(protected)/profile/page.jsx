'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowRight, Coins, Landmark, LogOut, Sparkles, WalletCards } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ProfileActions } from '@/components/profile/ProfileActions';
import { BinaryReferralLinks } from '@/components/referral/BinaryReferralLinks';
import { ProfileSkeleton } from '@/components/ui/PageSkeletons';
import { ErrorState } from '@/components/ui/ErrorState';
import { getMe } from '@/lib/services/authService';
import { getWallet } from '@/lib/services/walletService';
import { queryKeys } from '@/lib/query/queryKeys';
import { useAuthStore } from '@/lib/store/authStore';
import { clearStoredToken } from '@/lib/utils/tokenStorage';
import { currency, number, rankLabel } from '@/lib/utils/format';
import { isSeller } from '@/lib/constants/access';

function WalletCard({ title, description, value, accent, icon: Icon, href, actionLabel }) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}><Icon size={18} /></span>
        {href ? <Link href={href} className="text-[11px] font-semibold text-slate-500">{actionLabel}</Link> : null}
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

function WalletSection({ walletQuery }) {
  if (walletQuery.isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-[28px] border border-slate-200 bg-white/80" />)}
      </div>
    );
  }

  if (walletQuery.isError) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Wallet balances could not be loaded right now.
      </div>
    );
  }

  const wallet = walletQuery.data?.wallet || {};
  const incomeBalance = Number(wallet.income_wallet_balance ?? wallet.income_balance ?? 0);
  const depositBalance = Number(wallet.deposit_wallet_balance ?? wallet.deposit_balance ?? 0);
  const btctBalance = Number(wallet.btct_wallet_balance ?? wallet.btct_balance ?? 0);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Wallets</p>
          <p className="mt-1 text-xs text-slate-500">Three separate balances from your live backend wallet data.</p>
        </div>
        <Link href="/wallet" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">Open wallet <ArrowRight size={14} /></Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <WalletCard
          title="Income Wallet"
          description="Your earnings balance"
          value={currency(incomeBalance)}
          accent="bg-emerald-50 text-emerald-700"
          icon={Landmark}
          href="/history/income"
          actionLabel="View history"
        />
        <WalletCard
          title="Deposit Wallet"
          description="Your deposited funds"
          value={currency(depositBalance)}
          accent="bg-sky-50 text-sky-700"
          icon={ArrowDownToLine}
          href="/deposit"
          actionLabel="Open deposits"
        />
        <WalletCard
          title="BTCT Wallet"
          description="Your BTCT reward balance"
          value={`${number(btctBalance)} BTCT`}
          accent="bg-amber-50 text-amber-700"
          icon={Coins}
          href="/wallet"
          actionLabel="Wallet details"
        />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const sessionUser = useAuthStore((s) => s.user);

  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: getMe, enabled: hydrated && Boolean(token), retry: false, initialData: sessionUser || undefined });
  const walletQuery = useQuery({ queryKey: queryKeys.wallet, queryFn: getWallet, enabled: hydrated && Boolean(token) });

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
      <SectionHeader title="Profile" subtitle="Account details, separate wallets, and referral sharing." />

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

      <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_55%,#eef6ff_100%)] p-4 shadow-[0_24px_50px_rgba(15,23,42,0.08)]">
        <div className="mb-4 flex items-center gap-2 text-slate-800">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white"><WalletCards size={16} /></span>
          <div>
            <p className="text-sm font-semibold">Wallet Overview</p>
            <p className="text-xs text-slate-500">Income, deposit, and BTCT balances kept separate.</p>
          </div>
        </div>
        <WalletSection walletQuery={walletQuery} />
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
