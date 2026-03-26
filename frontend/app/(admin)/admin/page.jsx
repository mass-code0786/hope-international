'use client';

import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { MetricCard } from '@/components/admin/MetricCard';
import { DataTable } from '@/components/admin/DataTable';
import { SummaryPanel } from '@/components/admin/SummaryPanel';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { ErrorState } from '@/components/ui/ErrorState';
import { queryKeys } from '@/lib/query/queryKeys';
import { currency, incomeSourceLabel, number, shortDate } from '@/lib/utils/format';
import { getAdminDashboardOverview } from '@/lib/services/admin';

export default function AdminDashboardPage() {
  const overviewQuery = useQuery({ queryKey: queryKeys.adminDashboard, queryFn: getAdminDashboardOverview });

  if (overviewQuery.isLoading) return <AdminShellSkeleton />;
  if (overviewQuery.isError) return <ErrorState message="Admin dashboard failed to load." onRetry={overviewQuery.refetch} />;

  const overview = overviewQuery.data?.data || {};
  const summary = overview.summary || {};
  const charts = overview.charts || {};
  const orders = Array.isArray(overview.recentOrders) ? overview.recentOrders : [];
  const txs = Array.isArray(overview.recentTransactions) ? overview.recentTransactions : [];

  const trendData = Array.isArray(charts.weeklySalesTrend)
    ? charts.weeklySalesTrend.map((row) => ({
      name: shortDate(row.week_start),
      sales: Number(row.sales_amount || 0),
      payout: Number(row.sales_bv || 0)
    }))
    : [];

  const splitData = Array.isArray(charts.incomeDistribution)
    ? charts.incomeDistribution.map((row) => ({
      name: incomeSourceLabel(row.source),
      value: Number(row.total_amount || 0)
    }))
    : [];

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Operations Dashboard" subtitle="Company-wide performance and compensation monitoring" />

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
        <div className="card-surface h-80 p-4">
          <p className="mb-3 text-sm text-muted">Weekly Sales vs Payout Trend</p>
          <ResponsiveContainer width="100%" height="88%">
            <AreaChart data={trendData}>
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: '#151515', border: '1px solid #2a2a2a' }} />
              <Area type="monotone" dataKey="sales" stroke="#d4af37" fill="#d4af3722" />
              <Area type="monotone" dataKey="payout" stroke="#22c55e" fill="#22c55e22" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card-surface h-80 p-4">
          <p className="mb-3 text-sm text-muted">Income Distribution</p>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={splitData}>
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: '#151515', border: '1px solid #2a2a2a' }} />
              <Legend />
              <Bar dataKey="value" fill="#d4af37" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SummaryPanel
          title="Cycle Status"
          items={[
            { label: 'Weekly Cycle', value: summary.current_weekly_cycle_status || 'Unknown' },
            { label: 'Monthly Cycle', value: summary.current_monthly_cycle_status || 'Unknown' },
            { label: 'Reward Qualified Users', value: number(summary.total_reward_qualification_count) }
          ]}
        />

        <SummaryPanel
          title="Compensation Totals"
          items={[
            { label: 'Reward Cash Value', value: currency(summary.total_reward_cash_value) },
            { label: 'Inactive Users', value: number(summary.inactive_users) },
            { label: 'Total BV', value: number(summary.total_bv) }
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DataTable
          columns={[
            { key: 'id', title: 'Order', className: 'col-span-3', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
            { key: 'status', title: 'Status', className: 'col-span-2' },
            { key: 'total_amount', title: 'Amount', className: 'col-span-3', render: (row) => currency(row.total_amount) },
            { key: 'created_at', title: 'Date', className: 'col-span-4', render: (row) => shortDate(row.created_at) }
          ]}
          rows={orders}
        />

        <DataTable
          columns={[
            { key: 'source', title: 'Source', className: 'col-span-4', render: (row) => incomeSourceLabel(row.source) },
            { key: 'tx_type', title: 'Type', className: 'col-span-2' },
            { key: 'amount', title: 'Amount', className: 'col-span-3', render: (row) => currency(row.amount) },
            { key: 'created_at', title: 'Date', className: 'col-span-3', render: (row) => shortDate(row.created_at) }
          ]}
          rows={txs}
        />
      </div>
    </div>
  );
}
