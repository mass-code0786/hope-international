'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { SummaryPanel } from '@/components/admin/SummaryPanel';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminUserFinancialOverview } from '@/lib/services/admin';
import { currency, dateTime, incomeSourceLabel, rankLabel } from '@/lib/utils/format';

function SectionCard({ title, rows, columns }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <DataTable
        columns={columns}
        rows={rows}
        empty={<EmptyState title={`No ${title.toLowerCase()} found`} description="No records available." />}
      />
    </div>
  );
}

export default function AdminUserFinancialDetailPage() {
  const params = useParams();
  const id = String(params?.id || '');

  const overviewQuery = useQuery({
    queryKey: queryKeys.adminUserFinancialOverview(id),
    queryFn: () => getAdminUserFinancialOverview(id),
    enabled: Boolean(id)
  });

  if (overviewQuery.isLoading) return <AdminShellSkeleton />;
  if (overviewQuery.isError) return <ErrorState message="Unable to load user financial overview." onRetry={overviewQuery.refetch} />;

  const data = overviewQuery.data?.data || {};
  const profile = data.profile || {};
  const wallet = data.wallet || {};

  return (
    <div className="space-y-5">
      <AdminSectionHeader
        title="User Financial Overview"
        subtitle={`Detailed operations view for ${profile.username || 'user'}`}
        action={<Link href="/admin/users" className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted">Back to Users</Link>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryPanel title="Profile" items={[
          { label: 'Username', value: profile.username || '-' },
          { label: 'Email', value: profile.email || '-' },
          { label: 'Rank', value: rankLabel(profile.rank_name) }
        ]} />
        <SummaryPanel title="Referral" items={[
          { label: 'Sponsor', value: profile.sponsor_username || profile.sponsor_id || '-' },
          { label: 'Parent', value: profile.parent_username || profile.parent_id || '-' },
          { label: 'Placement', value: profile.placement_side || '-' }
        ]} />
        <SummaryPanel title="Wallet" items={[
          { label: 'Balance', value: currency(wallet.balance || 0) },
          { label: 'Carry Left PV', value: profile.carry_left_pv || 0 },
          { label: 'Carry Right PV', value: profile.carry_right_pv || 0 }
        ]} />
        <SummaryPanel title="Wallet Binding" items={[
          { label: 'Address', value: data.walletBinding?.wallet_address || '-' },
          { label: 'Network', value: data.walletBinding?.network || '-' },
          { label: 'Updated', value: data.walletBinding?.updated_at ? dateTime(data.walletBinding.updated_at) : '-' }
        ]} />
      </div>

      <SectionCard
        title="Deposits"
        rows={Array.isArray(data.deposits) ? data.deposits : []}
        columns={[
          { key: 'id', title: 'Request', className: 'col-span-2', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
          { key: 'amount', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.amount) },
          { key: 'method', title: 'Method', className: 'col-span-2' },
          { key: 'status', title: 'Status', className: 'col-span-2', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'created_at', title: 'Date', className: 'col-span-4', render: (row) => dateTime(row.created_at) }
        ]}
      />

      <SectionCard
        title="Withdrawals"
        rows={Array.isArray(data.withdrawals) ? data.withdrawals : []}
        columns={[
          { key: 'id', title: 'Request', className: 'col-span-2', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
          { key: 'amount', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.amount) },
          { key: 'wallet_address', title: 'Wallet', className: 'col-span-4' },
          { key: 'status', title: 'Status', className: 'col-span-2', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'created_at', title: 'Date', className: 'col-span-2', render: (row) => dateTime(row.created_at) }
        ]}
      />

      <SectionCard
        title="P2P Transfers"
        rows={Array.isArray(data.p2pTransfers) ? data.p2pTransfers : []}
        columns={[
          { key: 'id', title: 'Transfer', className: 'col-span-2', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
          { key: 'from_username', title: 'From', className: 'col-span-2' },
          { key: 'to_username', title: 'To', className: 'col-span-2' },
          { key: 'amount', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.amount) },
          { key: 'status', title: 'Status', className: 'col-span-2', render: (row) => <StatusBadge status={row.status || 'completed'} /> },
          { key: 'created_at', title: 'Date', className: 'col-span-2', render: (row) => dateTime(row.created_at) }
        ]}
      />

      <SectionCard
        title="Income History"
        rows={Array.isArray(data.incomeHistory) ? data.incomeHistory : []}
        columns={[
          { key: 'id', title: 'Txn', className: 'col-span-2', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
          { key: 'source', title: 'Source', className: 'col-span-3', render: (row) => incomeSourceLabel(row.source) },
          { key: 'amount', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.amount) },
          { key: 'tx_type', title: 'Type', className: 'col-span-2', render: (row) => <StatusBadge status={row.tx_type} /> },
          { key: 'created_at', title: 'Date', className: 'col-span-3', render: (row) => dateTime(row.created_at) }
        ]}
      />

      <SectionCard
        title="Orders"
        rows={Array.isArray(data.orders) ? data.orders : []}
        columns={[
          { key: 'id', title: 'Order', className: 'col-span-2', render: (row) => `#${String(row.id || '').slice(0, 8)}` },
          { key: 'status', title: 'Status', className: 'col-span-2', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'total_amount', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.total_amount) },
          { key: 'total_bv', title: 'BV', className: 'col-span-2' },
          { key: 'total_pv', title: 'PV', className: 'col-span-2' },
          { key: 'created_at', title: 'Date', className: 'col-span-2', render: (row) => dateTime(row.created_at) }
        ]}
      />
    </div>
  );
}
