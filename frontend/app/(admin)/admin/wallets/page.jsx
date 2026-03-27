'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { FilterBar } from '@/components/admin/FilterBar';
import { SearchInput } from '@/components/admin/SearchInput';
import { DataTable } from '@/components/admin/DataTable';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { queryKeys } from '@/lib/query/queryKeys';
import { getAdminWalletBindings, updateAdminWalletBinding, removeAdminWalletBinding } from '@/lib/services/admin';
import { dateTime } from '@/lib/utils/format';

export default function AdminWalletBindingsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const bindingsQuery = useQuery({
    queryKey: [...queryKeys.adminWalletBindings, search, page],
    queryFn: () => getAdminWalletBindings({ search, page, limit: 20 })
  });

  const upsertMutation = useMutation({
    mutationFn: ({ userId, walletAddress, network }) => updateAdminWalletBinding(userId, { walletAddress, network }),
    onSuccess: async (result) => {
      toast.success(result.message || 'Wallet binding updated');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletBindings });
    },
    onError: (error) => toast.error(error.message || 'Failed to update binding')
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => removeAdminWalletBinding(userId),
    onSuccess: async (result) => {
      toast.success(result.message || 'Wallet binding removed');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletBindings });
    },
    onError: (error) => toast.error(error.message || 'Failed to remove binding')
  });

  if (bindingsQuery.isLoading) return <AdminShellSkeleton />;
  if (bindingsQuery.isError) return <ErrorState message="Unable to load wallet bindings." onRetry={bindingsQuery.refetch} />;

  const envelope = bindingsQuery.data || {};
  const rows = Array.isArray(envelope.data) ? envelope.data : [];
  const pagination = envelope.pagination || {};

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Wallet Binding Management" subtitle="Inspect, update, or remove user wallet address bindings" />

      <FilterBar>
        <div className="w-full max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search by username, email, wallet or user id" /></div>
      </FilterBar>

      <DataTable
        columns={[
          { key: 'user_id', title: 'User ID', className: 'col-span-2', render: (row) => `#${String(row.user_id || '').slice(0, 8)}` },
          { key: 'username', title: 'User', className: 'col-span-2', render: (row) => row.username || '-' },
          { key: 'wallet_address', title: 'Wallet Address', className: 'col-span-3', render: (row) => row.wallet_address || '-' },
          { key: 'network', title: 'Network', className: 'col-span-1', render: (row) => row.network || '-' },
          { key: 'updated_at', title: 'Updated', className: 'col-span-2', render: (row) => dateTime(row.updated_at) },
          {
            key: 'actions',
            title: 'Action',
            className: 'col-span-2',
            render: (row) => (
              <div className="flex gap-1">
                <button
                  disabled={upsertMutation.isPending}
                  onClick={() => {
                    const walletAddress = window.prompt('Wallet address', row.wallet_address || '') || '';
                    if (!walletAddress) return;
                    const network = window.prompt('Network (optional)', row.network || '') || '';
                    upsertMutation.mutate({ userId: row.user_id, walletAddress, network });
                  }}
                  className="rounded-lg bg-sky-600/20 px-2 py-1 text-xs text-sky-300 disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  disabled={removeMutation.isPending}
                  onClick={() => {
                    if (!window.confirm('Remove this wallet binding?')) return;
                    removeMutation.mutate(row.user_id);
                  }}
                  className="rounded-lg bg-rose-600/20 px-2 py-1 text-xs text-rose-300 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )
          }
        ]}
        rows={rows}
        empty={<EmptyState title="No wallet bindings found" description="No wallet bindings match your search filters." />}
      />

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(pagination.page || 1) <= 1} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Previous</button>
        <button onClick={() => setPage((p) => ((pagination.totalPages || 1) > p ? p + 1 : p))} disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
