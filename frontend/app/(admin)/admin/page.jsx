'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { MetricCard } from '@/components/admin/MetricCard';
import { DataTable } from '@/components/admin/DataTable';
import { SummaryPanel } from '@/components/admin/SummaryPanel';
import { ErrorState } from '@/components/ui/ErrorState';
import { queryKeys } from '@/lib/query/queryKeys';
import { currency, incomeSourceLabel, number, shortDate } from '@/lib/utils/format';
import { getAdminDashboardOverview } from '@/lib/services/admin';

function ChartFrame({ title, children }) {
  return (
    <div className="card-surface p-4">
      <p className="mb-3 text-sm font-semibold text-text">{title}</p>
      <div className="h-[260px] min-h-[260px] w-full min-w-0">{children}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const overviewQuery = useQuery({ queryKey: queryKeys.adminDashboard, queryFn: getAdminDashboardOverview });

  const overview = overviewQuery.data?.data || {};
  const summary = overview.summary || {};
  const charts = overview.charts || {};
  const orders = Array.isArray(overview.recentOrders) ? overview.recentOrders : [];
  const txs = Array.isArray(overview.recentTransactions) ? overview.recentTransactions : [];

  const trendData = useMemo(() => (
    Array.isArray(charts.weeklySalesTrend)
      ? charts.weeklySalesTrend.map((row) => ({
        name: shortDate(row.week_start),
        sales: Number(row.sales_amount || 0),
        payout: Number(row.sales_bv || 0)
      }))
      : []
  ), [charts.weeklySalesTrend]);

  const splitData = useMemo(() => (
    Array.isArray(charts.incomeDistribution)
      ? charts.incomeDistribution.map((row) => ({
        name: incomeSourceLabel(row.source),
        value: Number(row.total_amount || 0)
      }))
      : []
  ), [charts.incomeDistribution]);

  if (overviewQuery.isLoading) return null;
  if (overviewQuery.isError) return <ErrorState message="Admin dashboard failed to load." onRetry={overviewQuery.refetch} />;

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Operations Dashboard" subtitle="Company-wide performance, payout visibility, and live commercial activity in one executive view." />

      <div className="card-surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Control center</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-text">Hope operations snapshot</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">This overview combines users, sales, compensation, and recent finance movement into a cleaner command surface for the admin team.</p>
          </div>
          <div className="rounded-[28px] border border-[var(--hope-border)] bg-cardSoft px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Total sales</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-text">{currency(summary.total_sales_amount)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Users" value={number(summary.total_users)} />
        <MetricCard title="Active Users" value={number(summary.active_users)} />
        <MetricCard title="Total Sales Amount" value={currency(summary.total_sales_amount)} />
        <MetricCard title="Total PV" value={number(summary.total_pv)} />
        <MetricCard title="Paid Orders" value={number(summary.total_paid_orders)} />
        <MetricCard title="Direct Paid" value={currency(summary.total_direct_income_paid)} />
        <MetricCard title="Matching Paid" value={currency(summary.total_matching_income_paid)} />
        <MetricCard title="Cap Overflow" value={currency(summary.total_cap_overflow)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartFrame title="Weekly Sales vs Payout Trend">
          <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
            <AreaChart data={trendData}>
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: 18 }} />
              <Area type="monotone" dataKey="sales" stroke="#0f766e" fill="rgba(15,118,110,0.18)" />
              <Area type="monotone" dataKey="payout" stroke="#d97706" fill="rgba(217,119,6,0.16)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame title="Income Distribution">
          <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
            <BarChart data={splitData}>
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: 18 }} />
              <Legend />
              <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SummaryPanel title="Cycle Status" items={[
          { label: 'Weekly Cycle', value: summary.current_weekly_cycle_status || 'Unknown' },
          { label: 'Monthly Cycle', value: summary.current_monthly_cycle_status || 'Unknown' },
          { label: 'Reward Qualified Users', value: number(summary.total_reward_qualification_count) }
        ]} />

        <SummaryPanel title="Compensation Totals" items={[
          { label: 'Reward Cash Value', value: currency(summary.total_reward_cash_value) },
          { label: 'Inactive Users', value: number(summary.inactive_users) },
          { label: 'Total BV', value: number(summary.total_bv) }
        ]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataTable columns={[
          { key: 'id', title: 'Order', className: 'col-span-3', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
          { key: 'status', title: 'Status', className: 'col-span-2' },
          { key: 'total_amount', title: 'Amount', className: 'col-span-3', render: (row) => currency(row.total_amount) },
          { key: 'created_at', title: 'Date', className: 'col-span-4', render: (row) => shortDate(row.created_at) }
        ]} rows={orders} />

        <DataTable columns={[
          { key: 'source', title: 'Source', className: 'col-span-4', render: (row) => incomeSourceLabel(row.source) },
          { key: 'tx_type', title: 'Type', className: 'col-span-2' },
          { key: 'amount', title: 'Amount', className: 'col-span-3', render: (row) => currency(row.amount) },
          { key: 'created_at', title: 'Date', className: 'col-span-3', render: (row) => shortDate(row.created_at) }
        ]} rows={txs} />
      </div>
    </div>
  );
}
