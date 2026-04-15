'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, CircleDollarSign, Coins, Fingerprint, Headset, History, Landmark, Link2, LoaderCircle, LogOut, Network, ShieldCheck, Sparkles, Store, Trash2, WalletCards } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProfileActions } from '@/components/profile/ProfileActions';
import { BinaryReferralLinks } from '@/components/referral/BinaryReferralLinks';
import { ProfileSkeleton } from '@/components/ui/PageSkeletons';
import { ErrorState } from '@/components/ui/ErrorState';
import BtctCoinLogo from '@/components/common/BtctCoinLogo';
import { getMe, getWebauthnRegisterOptions, getWebauthnStatus, removeWebauthnCredential, verifyWebauthnRegister } from '@/lib/services/authService';
import { getWallet } from '@/lib/services/walletService';
import { queryKeys } from '@/lib/query/queryKeys';
import { useAuthStore } from '@/lib/store/authStore';
import { clearStoredToken } from '@/lib/utils/tokenStorage';
import { currency, formatLabel, number, rankLabel } from '@/lib/utils/format';
import { isSeller } from '@/lib/constants/access';
import { createWebAuthnCredential, supportsWebAuthn } from '@/lib/utils/webauthn';
import { clearProtectedQueries } from '@/lib/utils/logout';

function ProfileInfoCard({ label, value, subtitle = null, className = '', statusTone = '' }) {
  return (
    <article className={`rounded-[20px] border border-[rgba(255,255,255,0.07)] bg-[#171c26] px-4 py-3.5 shadow-[0_14px_28px_rgba(0,0,0,0.22)] ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-2 break-words text-[1rem] font-semibold tracking-[-0.03em] text-white ${statusTone}`}>{value}</p>
      {subtitle ? <p className="mt-1.5 text-[12px] leading-5 text-slate-400">{subtitle}</p> : null}
    </article>
  );
}

function WalletCard({ title, value, accent, icon: Icon, href, actionLabel, titleIcon = null, valueIcon = null }) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.06)] bg-[#1f2430] px-3.5 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent}`}><Icon size={18} /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.01em] text-slate-400">
              {titleIcon}
              <p>{formatLabel(title)}</p>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[1.35rem] font-semibold tracking-[-0.05em] text-white">
              {valueIcon}
              <p>{value}</p>
            </div>
          </div>
        </div>
        {href ? <Link href={href} className="shrink-0 text-[12px] font-semibold text-slate-400 opacity-70">{actionLabel}</Link> : null}
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
  const bonusBalance = Number(wallet.bonus_wallet_balance ?? wallet.bonus_balance ?? wallet.auction_bonus_wallet_balance ?? wallet.auction_bonus_balance ?? 0);
  const btctBalance = Number(wallet.btct_wallet_balance ?? wallet.btct_balance ?? 0);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950 dark:text-text">Wallets</p>
        <Link href="/wallet" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-accent">Open wallet <ArrowRight size={14} /></Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <WalletCard title="Income Wallet" value={currency(incomeBalance)} accent="bg-emerald-50 text-emerald-700" icon={Landmark} href="/history/income" actionLabel="View history" />
        <WalletCard title="Deposit Wallet" value={currency(depositBalance)} accent="bg-sky-50 text-sky-700" icon={ArrowDownToLine} href="/deposit" actionLabel="Open deposits" />
        <WalletCard title="Bonus Wallet" value={currency(bonusBalance)} accent="bg-amber-50 text-amber-700" icon={Sparkles} href="/wallet" actionLabel="Wallet details" />
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

function BiometricAccessCard({ user, queryClient }) {
  const [supported] = useState(() => supportsWebAuthn());
  const webauthnQuery = useQuery({
    queryKey: queryKeys.webauthn,
    queryFn: async () => {
      const response = await getWebauthnStatus();
      return response.data || response;
    },
    enabled: Boolean(user)
  });

  const enableMutation = useMutation({
    mutationFn: async () => {
      const optionsResponse = await getWebauthnRegisterOptions();
      if (process.env.NODE_ENV !== 'production') {
        console.info('[webauthn.frontend] enable-button-options-response', {
          hasDataEnvelope: Boolean(optionsResponse?.data),
          challengeLength: String(optionsResponse?.data?.challenge || optionsResponse?.challenge || '').length,
          userIdLength: String(optionsResponse?.data?.user?.id || optionsResponse?.user?.id || '').length
        });
      }
      const credentialPayload = await createWebAuthnCredential(optionsResponse.data || optionsResponse);
      if (process.env.NODE_ENV !== 'production') {
        console.info('[webauthn.frontend] enable-button-verify-payload', {
          challengeLength: String(credentialPayload?.challenge || '').length,
          rawIdLength: String(credentialPayload?.rawId || '').length,
          credentialIdLength: String(credentialPayload?.credentialId || '').length,
          clientDataJSONLength: String(credentialPayload?.clientDataJSON || '').length,
          attestationObjectLength: String(credentialPayload?.attestationObject || '').length,
          authenticatorDataLength: String(credentialPayload?.authenticatorData || '').length
        });
      }
      const verifyResponse = await verifyWebauthnRegister(credentialPayload);
      return verifyResponse.data || verifyResponse;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.webauthn });
      toast.success('Biometric login enabled');
    },
    onError: (error) => {
      toast.error(error?.message || 'Biometric setup failed');
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (credentialId) => {
      const response = await removeWebauthnCredential(credentialId);
      return response.data || response;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.webauthn });
      toast.success('Biometric login removed');
    },
    onError: (error) => {
      toast.error(error?.message || 'Could not remove biometric login');
    }
  });

  const credentials = webauthnQuery.data?.credentials || [];
  const enabled = Boolean(webauthnQuery.data?.enabled);

  return (
    <div className="mt-4 rounded-[24px] border border-[rgba(255,255,255,0.07)] bg-[linear-gradient(180deg,rgba(22,27,36,0.98),rgba(17,20,27,0.98))] p-4 shadow-[0_18px_36px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#1b212c] text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
              <Fingerprint size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Biometric Login</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Enable passkeys for fingerprint, face unlock, or device PIN on supported browsers.</p>
            </div>
          </div>
          <p className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.14)] ${enabled ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-[rgba(255,255,255,0.08)] bg-[#1b212c] text-slate-300'}`}>
            <ShieldCheck size={13} />
            {enabled ? 'Enabled' : 'Not enabled'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => enableMutation.mutate()}
          disabled={!supported || enableMutation.isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-[rgba(255,255,255,0.12)] bg-[#1a1f28] px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,0,0,0.22)] transition hover:border-[rgba(255,255,255,0.2)] hover:bg-[#202631] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enableMutation.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Fingerprint size={16} />}
          {enabled ? 'Add Another Device' : 'Enable Biometrics'}
        </button>
      </div>

      {!supported ? (
        <p className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#171c26] px-4 py-3 text-xs text-slate-400 shadow-[0_14px_30px_rgba(0,0,0,0.2)]">
          This browser or device does not support WebAuthn passkeys. Continue using your username and password here.
        </p>
      ) : null}

      {webauthnQuery.isLoading ? (
        <div className="mt-4 h-20 animate-pulse rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#171c26] shadow-[0_14px_30px_rgba(0,0,0,0.2)]" />
      ) : null}

      {webauthnQuery.isError ? (
        <div className="mt-4 rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
          Unable to load biometric devices right now.
        </div>
      ) : null}

      {credentials.length ? (
        <div className="mt-4 space-y-3">
          {credentials.map((credential) => (
            <div key={credential.id} className="flex flex-col gap-3 rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(27,33,44,0.96),rgba(21,26,35,0.96))] px-4 py-3 shadow-[0_16px_34px_rgba(0,0,0,0.22)] sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{credential.deviceName || 'Biometric Device'}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Added {new Date(credential.createdAt).toLocaleDateString()} {credential.lastUsedAt ? `| Last used ${new Date(credential.lastUsedAt).toLocaleDateString()}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeMutation.mutate(credential.id)}
                disabled={removeMutation.isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[14px] border border-rose-500/20 bg-rose-500/10 px-3.5 text-sm font-semibold text-rose-300 shadow-[0_12px_24px_rgba(127,29,29,0.14)] transition hover:bg-rose-500/14 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removeMutation.isPending ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Remove Biometrics
              </button>
            </div>
          ))}
        </div>
      ) : null}
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

  const meQuery = useQuery({ queryKey: queryKeys.me, queryFn: getMe, enabled: hydrated && Boolean(token) && !sessionUser, retry: false, initialData: sessionUser || undefined, initialDataUpdatedAt: sessionUser ? Date.now() : undefined });
  const walletQuery = useQuery({ queryKey: queryKeys.wallet, queryFn: getWallet, enabled: hydrated && Boolean(token), placeholderData: (previousData) => previousData });

  const user = meQuery.data ?? sessionUser ?? null;
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
    clearSession({ loggingOut: true });
    await clearProtectedQueries(queryClient);
    toast.success('Logged out successfully');
    router.replace('/login');
  }

  if (!hydrated || (token && meQuery.isPending && !user)) return <ProfileSkeleton />;
  if (token && meQuery.isError && !user) return <ErrorState message="Profile data could not be loaded." onRetry={meQuery.refetch} />;
  if (!user) return <ProfileSkeleton />;

  return (
    <div className="space-y-4">
      <SectionHeader title="Profile" />

      <div className="rounded-[22px] border border-[rgba(255,255,255,0.07)] bg-[#161b24] p-4 shadow-[0_18px_36px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-[1.6rem] font-semibold tracking-[-0.05em] text-white">{[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}</h3>
            <p className="mt-1.5 text-[13px] leading-5 text-slate-400">
              @{user.username || '-'} <span className="px-1.5 text-slate-600">/</span> {rankLabel(user.rank_name)} <span className="px-1.5 text-slate-600">/</span> Sponsor {user.sponsor_username || user.sponsor_id || 'N/A'}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-4 text-[13px] font-semibold text-rose-300 transition hover:bg-rose-500/14"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ProfileInfoCard label="Username" value={user.username || '-'} subtitle={`ID: ${user.id || '-'}`} />
        <ProfileInfoCard label="Rank" value={rankLabel(user.rank_name)} subtitle={`Sponsor: ${user.sponsor_username || user.sponsor_id || 'N/A'}`} />
        <ProfileInfoCard label="Email" value={user.email || '-'} />
      </div>

      <div className="rounded-[32px] border border-[rgba(255,255,255,0.06)] bg-[#11141b] p-4 shadow-[0_24px_50px_rgba(0,0,0,0.32)]">
        <div className="mb-4 flex items-center gap-2 text-slate-800 dark:text-text">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1f2430] text-white"><WalletCards size={16} /></span>
          <p className="text-sm font-semibold text-white">{formatLabel('Wallet Overview')}</p>
        </div>
        <WalletSection walletQuery={walletQuery} />
      </div>

      <BinaryReferralLinks username={user?.username} />

      <div className="card-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text">Key Access</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--hope-accent-soft)] px-3 py-1 text-[11px] font-semibold text-accent"><Link2 size={12} /> Connected surfaces</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map((item) => <QuickLinkCard key={item.href} {...item} />)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text">Referral access</p>
            <Link href="/team" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">Open team <ArrowRight size={15} /></Link>
          </div>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text">Security and access</p>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${user.is_active === false ? 'bg-rose-500/10 text-[#ef4444]' : 'bg-emerald-500/10 text-[#22c55e]'}`}><ShieldCheck size={13} /> {user.is_active === false ? 'Inactive' : 'Active'}</span>
          </div>
          <BiometricAccessCard user={user} queryClient={queryClient} />
        </div>
      </div>

      <ProfileActions referralLink={referralLink} onLogout={onLogout} />
    </div>
  );
}
