'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQueries } from '@tanstack/react-query';
import { CircleDollarSign, ClipboardList, Crown, Network, ShieldCheck, UsersRound, Wallet } from 'lucide-react';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions';
import { BinarySummary } from '@/components/dashboard/BinarySummary';
import { IncomeHighlights } from '@/components/dashboard/IncomeHighlights';
import { DashboardActivity } from '@/components/dashboard/DashboardActivity';
import { BinaryReferralLinks } from '@/components/referral/BinaryReferralLinks';
import { ErrorState } from '@/components/ui/ErrorState';
import { DashboardSkeleton } from '@/components/ui/PageSkeletons';
import { StatCard } from '@/components/ui/StatCard';
import { getMe } from '@/lib/services/authService';
import { getOrders } from '@/lib/services/ordersService';
import { getMySupportThreads } from '@/lib/services/supportService';
import { getTeamChildren, getTeamSummary } from '@/lib/services/teamService';
import { getWallet } from '@/lib/services/walletService';
import { queryKeys } from '@/lib/query/queryKeys';
import { useSellerMe } from '@/hooks/useSellerMe';
import { currency, dateTime, incomeSourceLabel, number, rankLabel, shortDate } from '@/lib/utils/format';
import { isSeller } from '@/lib/constants/access';

function sumSource(transactions, source) {
  return transactions
    .filter((item) => item?.source === source && item?.tx_type === 'credit')
    .reduce((total, item) => total + Number(item?.amount || 0), 0);
}

export default function DashboardPage() {
  const sellerQuery = useSellerMe({ retry: false });
  const [meQuery, walletQuery, ordersQuery, childrenQuery, teamSummaryQuery, supportQuery] = useQueries({
    queries: [
      { queryKey: queryKeys.me, queryFn: getMe },
      { queryKey: queryKeys.wallet, queryFn: getWallet },
      { queryKey: queryKeys.orders, queryFn: getOrders },
      { queryKey: queryKeys.teamChildren, queryFn: getTeamChildren },
      { queryKey: queryKeys.teamSummary, queryFn: getTeamSummary },
      { queryKey: [...queryKeys.supportThreads, 'dashboard'], queryFn: () => getMySupportThreads({ limit: 5 }) }
    ]
  });

  const isLoading = [meQuery, walletQuery, ordersQuery, childrenQuery, teamSummaryQuery, supportQuery].some((query) => query.isLoading);
  const isError = meQuery.isError || walletQuery.isError || ordersQuery.isError || childrenQuery.isError || teamSummaryQuery.isError || supportQuery.isError;

  const me = meQuery.data || {};
  const wallet = walletQuery.data?.wallet || {};
  const transactions = Array.isArray(walletQuery.data?.transactions) ? walletQuery.data.transactions : [];
  const orders = Array.isArray(ordersQuery.data) ? ordersQuery.data : [];
  const children = Array.isArray(childrenQuery.data) ? childrenQuery.data : [];
  const teamSummary = teamSummaryQuery.data || {};
  const supportThreads = Array.isArray(supportQuery.data?.data) ? supportQuery.data.data : [];

  const directIncome = sumSource(transactions, 'direct_income');
  const matchingIncome = sumSource(transactions, 'matching_income');
  const rewardIncome = sumSource(transactions, 'reward_qualification');
  const overflowIncome = transactions.filter((item) => item?.source === 'cap_overflow').reduce((total, item) => total + Number(item?.amount || 0), 0);
  const walletBalance = Number(wallet?.balance || 0);
  const activeDirects = children.filter((child) => child?.is_active !== false).length;
  const carryLeft = Number(me?.carry_left_pv || 0);
  const carryRight = Number(me?.carry_right_pv || 0);
  const sponsorLabel = [me?.sponsor_first_name, me?.sponsor_last_name].filter(Boolean).join(' ').trim() || me?.sponsor_username || 'No sponsor assigned';
  const placementLabel = me?.placement_side ? `${String(me.placement_side).charAt(0).toUpperCase()}${String(me.placement_side).slice(1)} leg` : 'Not placed yet';

  const recentIncome = useMemo(() => {
    return transactions
      .filter((item) => item?.tx_type === 'credit')
      .slice(0, 4)
      .map((item, index) => ({
        id: item?.id || `income-${index}`,
        title: incomeSourceLabel(item?.source),
        subtitle: dateTime(item?.created_at),
        value: currency(item?.amount)
      }));
  }, [transactions]);

  const recentOrders = useMemo(() => {
    return orders.slice(0, 4).map((item, index) => ({
      id: item?.id || `order-${index}`,
      title: `Order #${String(item?.id || '').slice(0, 8) || index + 1}`,
      subtitle: `${currency(item?.total_amount)} | ${shortDate(item?.created_at)}`,
      status: item?.status || 'pending'
    }));
  }, [orders]);

  const recentJoins = useMemo(() => {
    return [...children]
      .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
      .slice(0, 4)
      .map((item, index) => ({
        id: item?.id || `join-${index}`,
        title: item?.username || 'Member',
        subtitle: `${item?.placement_side || 'unplaced'} | Joined ${shortDate(item?.created_at)}`,
        active: item?.is_active !== false
      }));
  }, [children]);

  const supportActivity = useMemo(() => {
    return supportThreads.slice(0, 4).map((item, index) => ({
      id: item?.id || `support-${index}`,
      title: item?.subject || 'Support thread',
      subtitle: `${item?.category_label || item?.category || 'General'} | ${shortDate(item?.updated_at || item?.created_at)}`,
      badge: item?.status || 'open',
      variant: item?.status === 'closed' ? 'default' : item?.status === 'replied' ? 'success' : 'warning'
    }));
  }, [supportThreads]);

  const sellerHref = isSeller(me) || sellerQuery.data?.canAccessDashboard ? '/seller' : '/seller/apply';
  const sellerLabel = isSeller(me) || sellerQuery.data?.canAccessDashboard ? 'Seller Hub' : 'Apply Seller';

  if (isLoading) return <DashboardSkeleton />;
  if (isError) {
    return <ErrorState message="Dashboard data could not be loaded." onRetry={() => { meQuery.refetch(); walletQuery.refetch(); ordersQuery.refetch(); childrenQuery.refetch(); teamSummaryQuery.refetch(); supportQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-5">
      <DashboardHero
        user={me}
        referralCode={me?.username || me?.id}
        sponsorLabel={sponsorLabel}
        placementLabel={placementLabel}
        teamSize={number(teamSummary?.total_descendants || 0)}
        activeTeam={number(teamSummary?.active_count || 0)}
      />

      <BinaryReferralLinks username={me?.username} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard compact title="Wallet Balance" value={currency(walletBalance)} right={<Wallet size={18} className="text-accent" />} emphasis="primary" />
        <StatCard compact title="Direct Income" value={currency(directIncome)} right={<CircleDollarSign size={18} className="text-accent" />} />
        <StatCard compact title="Matching Income" value={currency(matchingIncome)} right={<Network size={18} className="text-accent" />} />
        <StatCard compact title="Reward Income" value={currency(rewardIncome)} right={<Crown size={18} className="text-accent" />} />
        <StatCard compact title="Rank" value={rankLabel(me?.rank_name)} subtitle={`Lifetime BV ${number(me?.lifetime_bv || 0)}`} right={<ShieldCheck size={18} className="text-accent" />} />
        <StatCard compact title="Team Size" value={number(teamSummary?.total_descendants || 0)} right={<UsersRound size={18} className="text-accent" />} />
        <StatCard compact title="Active Team" value={number(teamSummary?.active_count || 0)} subtitle={`${activeDirects} active directs`} right={<UsersRound size={18} className="text-accent" />} />
        <StatCard compact title="Carry Left PV" value={number(carryLeft)} right={<Network size={18} className="text-accent" />} />
        <StatCard compact title="Carry Right PV" value={number(carryRight)} right={<Network size={18} className="text-accent" />} />
        <StatCard compact title="Orders" value={number(orders.length)} subtitle="Recent shop activity" right={<ClipboardList size={18} className="text-accent" />} />
      </div>

      <DashboardQuickActions sellerHref={sellerHref} sellerLabel={sellerLabel} />

      <IncomeHighlights direct={directIncome} matching={matchingIncome} rewards={rewardIncome} overflow={overflowIncome} />

      <BinarySummary me={me} directChildren={children} teamSummary={teamSummary} />

      <DashboardActivity income={recentIncome} orders={recentOrders} joins={recentJoins} support={supportActivity} />

      <div className="card-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.04em] text-text">Need a deeper breakdown?</h2>
            <p className="mt-1 text-sm text-muted">Move into your full team, earnings, support, or order screens for the detailed operational view.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/income" className="hope-button-secondary">Open income</Link>
            <Link href="/orders" className="hope-button">Open orders</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
