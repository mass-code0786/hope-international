'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, CircleDollarSign, Coins, Headset, History, Landmark, Link2, LogOut, Network, ShieldCheck, Sparkles, Store, WalletCards } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ProfileActions } from '@/components/profile/ProfileActions';
import { BinaryReferralLinks } from '@/components/referral/BinaryReferralLinks';
import { ProfileSkeleton } from '@/components/ui/PageSkeletons';
import { ErrorState } from '@/components/ui/ErrorState';
import BtctCoinLogo from '@/components/common/BtctCoinLogo';
import { getMe } from '@/lib/services/authService';
import { getWallet } from '@/lib/services/walletService';
import { queryKeys } from '@/lib/query/queryKeys';
import { useAuthStore } from '@/lib/store/authStore';
import { clearStoredToken } from '@/lib/utils/tokenStorage';
import { currency, formatLabel, number, rankLabel } from '@/lib/utils/format';
import { isSeller } from '@/lib/constants/access';

function WalletCard({ title, value, accent, icon: Icon, href, actionLabel, titleIcon = null, valueIcon = null }) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white px-3.5 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[var(--hope-border)] dark:bg-card">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent}`}><Icon size={18} /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em] text-slate-500 dark:text-muted">
              {titleIcon}
              <p>{formatLabel(title)}</p>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[1.35rem] font-semibold tracking-[-0.05em] text-slate-950 dark:text-text">
              {valueIcon}
              <p>{value}</p>
            </div>
          </div>
        </div>
        {href ? <Link href={href} className="shrink-0 text-[12px] font-semibold text-slate-500 opacity-70 dark:text-muted">{actionLabel}</Link> : null}
      </div>
    </article>
  );
}

function WalletSection({ walletQuery }) {
  if (walletQuery.isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-[28px] border border-slate-200 bg-white/80 dark:border-[var(--hope-border)] dark:bg-cardSoft" />)}
      </div>
    );
  }

  if (walletQuery.isError) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
        Wallet balances could not be loaded right now.
      </div>
    );
  }

  const wallet = walletQuery.data?.wallet || {};
  const incomeBalance = Number(wallet.income_wallet_balance ?? wallet.income_balance ?? 0);
  const depositBalance = Number(wallet.deposit_wallet_balance ?? wallet.deposit_balance ?? 0);
  const withdrawalBalance = Number(wallet.withdrawal_wallet_balance ?? wallet.withdrawal_balance ?? wallet.balance ?? 0);
  const btctBalance = Number(wallet.btct_wallet_balance ?? wallet.btct_balance ?? 0);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-text">Wallets</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-muted">Income, deposit, withdrawal, and BTCT balances from live wallet data.</p>
        </div>
        <Link href="/wallet" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-accent">Open wallet <ArrowRight size={14} /></Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <WalletCard
          title="Income Wallet"
          value={currency(incomeBalance)}
          accent="bg-emerald-50 text-emerald-700"
          icon={Landmark}
          href="/history/income"
          actionLabel="View history"
        />
        <WalletCard
          title="Deposit Wallet"
          value={currency(depositBalance)}
          accent="bg-sky-50 text-sky-700"
          icon={ArrowDownToLine}
          href="/deposit"
          actionLabel="Open deposits"
        />
        <WalletCard
          title="Withdrawal Wallet"
          value={currency(withdrawalBalance)}
          accent="bg-violet-50 text-violet-700"
          icon={ArrowUpFromLine}
          href="/withdraw"
          actionLabel="Open withdrawals"
        />
        <WalletCard
          title="BTCT Wallet"
          value={`${number(btctBalance)} BTCT`}
          accent="bg-amber-50 text-amber-700"
          icon={Coins}
          titleIcon={<BtctCoinLogo size={14} className="shrink-0" />}
          valueIcon={<BtctCoinLogo size={18} className="shrink-0" />}
          href="/wallet"
          actionLabel="Wallet details"
        />
      </div>
    </div>
  );
}

function QuickLinkCard({ href, title, description, icon: Icon }) {
  return (
    <Link href={href} className="card-surface flex items-start gap-3 p-4 transition hover:-translate-y-0.5">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </div>
    </Link>
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
  const wallet = walletQuery.data?.wallet || {};
  const sellerHref = isSeller(user) ? '/seller' : '/seller/apply';
  const referralLink = useMemo(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const referralCode = user?.username || '';
    return `${appUrl}/register?ref=${encodeURIComponent(referralCode)}`;
  }, [user?.username]);

  const shortcuts = [
    { href: '/wallet', title: 'Wallet Center', description: 'Balances, BTCT staking, wallet history, and payout tools.', icon: WalletCards },
    { href: '/deposit', title: 'Deposits', description: 'Create deposits and review deposit history.', icon: ArrowDownToLine },
    { href: '/withdraw', title: 'Withdrawals', description: 'Withdrawal requests plus completed payout history.', icon: ArrowUpFromLine },
    { href: '/income', title: 'Income', description: 'Income wallet summary and all live income cards.', icon: CircleDollarSign },
    { href: '/history/income', title: 'Income History', description: 'Direct, level, reward, and deposit-linked income records.', icon: History },
    { href: '/orders', title: 'Orders', description: 'Current orders, order status, and shop activity.', icon: History },
    { href: '/history/auctions', title: 'Auction Hub', description: 'Auction history, results, and winner visibility.', icon: Sparkles },
    { href: '/team', title: 'Binary Team', description: 'Live binary tree, placements, and referral structure.', icon: Network },
    { href: '/support', title: 'Support Inbox', description: 'Open support requests and follow admin replies.', icon: Headset },
    { href: sellerHref, title: isSeller(user) ? 'Seller Console' : 'Seller Apply', description: isSeller(user) ? 'Manage your seller profile and product queue.' : 'Apply to unlock the seller console.', icon: Store }
  ];

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
      <SectionHeader title="Profile" subtitle="Identity, wallets, referral access, support, and every live account surface from one compact hub." eyebrow="Account" />

      <div className="card-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="hope-kicker mb-3"><Sparkles size={12} /> Account hub</span>
            <h3 className="text-2xl font-semibold tracking-[-0.05em] text-text">{[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">Username @{user.username || '-'} | Current rank {rankLabel(user.rank_name)} | Sponsor {user.sponsor_username || user.sponsor_id || 'N/A'}</p>
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

      <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_55%,#eef6ff_100%)] p-4 shadow-[0_24px_50px_rgba(15,23,42,0.08)] dark:border-[var(--hope-border)] dark:bg-[linear-gradient(180deg,rgba(8,15,24,0.92),rgba(11,18,29,0.88))]">
        <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-text">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950"><WalletCards size={16} /></span>
          <div>
            <p className="text-sm font-semibold">{formatLabel('Wallet Overview')}</p>
            <p className="text-xs text-slate-500 dark:text-muted">Income, deposit, withdrawal, and BTCT balances kept separate.</p>
          </div>
        </div>
        <WalletSection walletQuery={walletQuery} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard compact title={formatLabel('Income Wallet')} value={currency(wallet.income_wallet_balance ?? wallet.income_balance ?? 0)} uppercaseTitle={false} />
        <StatCard compact title={formatLabel('Deposit Wallet')} value={currency(wallet.deposit_wallet_balance ?? wallet.deposit_balance ?? 0)} uppercaseTitle={false} />
        <StatCard compact title={formatLabel('Withdrawal Wallet')} value={currency(wallet.withdrawal_wallet_balance ?? wallet.withdrawal_balance ?? wallet.balance ?? 0)} uppercaseTitle={false} />
        <StatCard compact title={formatLabel('BTCT Wallet')} value={`${number(wallet.btct_wallet_balance ?? wallet.btct_balance ?? 0)} BTCT`} uppercaseTitle={false} />
      </div>

      <BinaryReferralLinks username={user?.username} />

      <div className="card-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text">Key Access</p>
            <p className="mt-1 text-xs text-muted">Every live member feature is attached here with the correct destination.</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--hope-accent-soft)] px-3 py-1 text-[11px] font-semibold text-accent"><Link2 size={12} /> Connected surfaces</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map((item) => <QuickLinkCard key={item.href} {...item} />)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-text">Referral access</p>
              <p className="mt-1 text-xs text-muted">Use your share link and binary tree together to grow your network.</p>
            </div>
            <Link href="/team" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">Open team <ArrowRight size={15} /></Link>
          </div>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-text">Security and access</p>
              <p className="mt-1 text-xs text-muted">Active account state, referral routing, support access, and seller entry point.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><ShieldCheck size={13} /> {user.is_active === false ? 'Inactive' : 'Verified access'}</span>
          </div>
        </div>
      </div>

      <ProfileActions referralLink={referralLink} onLogout={onLogout} />
    </div>
  );
}
