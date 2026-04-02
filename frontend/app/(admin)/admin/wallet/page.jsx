'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { FilterBar } from '@/components/admin/FilterBar';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmationModal } from '@/components/admin/ConfirmationModal';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import BtctCoinLogo from '@/components/common/BtctCoinLogo';
import { queryKeys } from '@/lib/query/queryKeys';
import { createManualWalletAdjustment, getAdminBtctStaking, getAdminWalletSummary, getAdminWalletTransactions, runAdminBtctStakingPayouts } from '@/lib/services/admin';
import { currency, incomeSourceLabel, number, shortDate } from '@/lib/utils/format';

export default function AdminWalletPage() {
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ userId: '', amount: '', type: 'credit', reason: '' });
  const queryClient = useQueryClient();

  const txQuery = useQuery({
    queryKey: [...queryKeys.adminWalletTransactions, filter, page],
    queryFn: () => getAdminWalletTransactions({ source: filter, page, limit: 15 })
  });
  const summaryQuery = useQuery({ queryKey: queryKeys.adminWalletSummary, queryFn: getAdminWalletSummary });
  const stakingQuery = useQuery({ queryKey: queryKeys.adminBtctStaking, queryFn: getAdminBtctStaking });

  const adjustMutation = useMutation({
    mutationFn: () => createManualWalletAdjustment({ ...adjustForm, amount: Number(adjustForm.amount || 0) }),
    onSuccess: async (result) => {
      toast.success(result.message || 'Wallet adjustment posted');
      setConfirmOpen(false);
      setAdjustOpen(false);
      setAdjustForm({ userId: '', amount: '', type: 'credit', reason: '' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminWallet });
    },
    onError: (err) => toast.error(err.message || 'Adjustment failed')
  });

  const runPayoutsMutation = useMutation({
    mutationFn: () => runAdminBtctStakingPayouts({}),
    onSuccess: async (result) => {
      toast.success(result.message || 'BTCT staking payouts processed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminWallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminBtctStaking })
      ]);
    },
    onError: (err) => toast.error(err.message || 'BTCT staking payout run failed')
  });

  if (txQuery.isLoading || summaryQuery.isLoading || stakingQuery.isLoading) return <AdminShellSkeleton />;
  if (txQuery.isError) return <ErrorState message="Unable to load wallet ledger." onRetry={txQuery.refetch} />;
  if (summaryQuery.isError) return <ErrorState message="Unable to load wallet summary." onRetry={summaryQuery.refetch} />;
  if (stakingQuery.isError) return <ErrorState message="Unable to load BTCT staking data." onRetry={stakingQuery.refetch} />;

  const txEnvelope = txQuery.data || {};
  const txs = Array.isArray(txEnvelope.data) ? txEnvelope.data : [];
  const pagination = txEnvelope.pagination || {};
  const summary = summaryQuery.data?.data || {};
  const stakingData = stakingQuery.data?.data || {};
  const stakingPlans = Array.isArray(stakingData.plans) ? stakingData.plans : [];
  const stakingPayouts = Array.isArray(stakingData.payouts) ? stakingData.payouts : [];

  return (
    <div className="space-y-5">
      <AdminSectionHeader
        title="Wallet Operations"
        subtitle="Ledger visibility, BTCT staking oversight, and secure manual adjustments"
        action={
          <div className="flex gap-2">
            <button onClick={() => runPayoutsMutation.mutate()} disabled={runPayoutsMutation.isPending} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-text disabled:opacity-60">
              <span className="inline-flex items-center gap-2">
                <BtctCoinLogo size={16} className="shrink-0" />
                {runPayoutsMutation.isPending ? 'Running payouts...' : 'Run BTCT Payouts'}
              </span>
            </button>
            <button onClick={() => setAdjustOpen(true)} className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black">
              Manual Adjustment
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card-surface p-4 text-sm">Total credits: <span className="font-semibold text-text">{currency(summary.total_credits)}</span></div>
        <div className="card-surface p-4 text-sm">Total debits: <span className="font-semibold text-text">{currency(summary.total_debits)}</span></div>
        <div className="card-surface p-4 text-sm"><span className="inline-flex items-center gap-2"><BtctCoinLogo size={15} className="shrink-0" />Active staking plans:</span> <span className="font-semibold text-text">{stakingPlans.filter((item) => item.status === 'active').length}</span></div>
        <div className="card-surface p-4 text-sm"><span className="inline-flex items-center gap-2"><BtctCoinLogo size={15} className="shrink-0" />Staking payouts logged:</span> <span className="font-semibold text-text">{stakingPayouts.length}</span></div>
      </div>

      <div className="card-surface p-4">
        <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-text"><BtctCoinLogo size={17} className="shrink-0" />BTCT Staking Plans</h4>
        <DataTable
          columns={[
            { key: 'user', title: 'User', className: 'col-span-2', render: (row) => row.username || row.user_id },
            { key: 'staking_amount_btct', title: 'Locked BTCT', className: 'col-span-2', render: (row) => <span className="inline-flex items-center gap-1.5"><BtctCoinLogo size={14} className="shrink-0" />{number(row.staking_amount_btct)}</span> },
            { key: 'reward_amount_usd', title: 'Reward', className: 'col-span-2', render: (row) => currency(row.reward_amount_usd) },
            { key: 'next_payout_at', title: 'Next Payout', className: 'col-span-2', render: (row) => shortDate(row.next_payout_at) },
            { key: 'total_payouts', title: 'Payouts', className: 'col-span-2', render: (row) => row.total_payouts || 0 },
            { key: 'status', title: 'Status', className: 'col-span-2', render: (row) => <StatusBadge status={row.status} /> }
          ]}
          rows={stakingPlans}
        />
      </div>

      <div className="card-surface p-4">
        <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-text"><BtctCoinLogo size={17} className="shrink-0" />BTCT Staking Payout History</h4>
        <DataTable
          columns={[
            { key: 'user', title: 'User', className: 'col-span-2', render: (row) => row.username || row.user_id },
            { key: 'cycle_number', title: 'Cycle', className: 'col-span-2', render: (row) => `#${row.cycle_number}` },
            { key: 'payout_amount_usd', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.payout_amount_usd) },
            { key: 'credited_to', title: 'Credited To', className: 'col-span-3', render: (row) => row.credited_to || 'withdrawal_wallet' },
            { key: 'payout_date', title: 'Payout Date', className: 'col-span-3', render: (row) => shortDate(row.payout_date) }
          ]}
          rows={stakingPayouts}
        />
      </div>

      <FilterBar>
        {['all', 'direct_income', 'matching_income', 'reward_qualification', 'cap_overflow', 'manual_adjustment', 'btct_staking_payout'].map((source) => (
          <button key={source} onClick={() => setFilter(source)} className={`rounded-full px-3 py-2 text-xs ${filter === source ? 'bg-accent text-black' : 'bg-white/5 text-muted'}`}>
            {source === 'all' ? 'All' : incomeSourceLabel(source)}
          </button>
        ))}
      </FilterBar>

      <DataTable
        columns={[
          { key: 'user_id', title: 'User', className: 'col-span-2', render: (row) => row.user_id ? `#${String(row.user_id).slice(0, 8)}` : 'N/A' },
          { key: 'source', title: 'Source', className: 'col-span-3', render: (row) => incomeSourceLabel(row.source) },
          { key: 'tx_type', title: 'Type', className: 'col-span-2', render: (row) => <StatusBadge status={row.tx_type} /> },
          { key: 'amount', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.amount) },
          { key: 'created_at', title: 'Date', className: 'col-span-2', render: (row) => shortDate(row.created_at) },
          { key: 'meta', title: 'Meta', className: 'col-span-1', render: (row) => row.metadata?.note || row.metadata?.reason || row.metadata?.walletType || '-' }
        ]}
        rows={txs}
      />

      {adjustOpen ? (
        <div className="card-surface p-4">
          <h4 className="text-sm font-semibold text-text">Manual Adjustment Form</h4>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input value={adjustForm.userId} onChange={(e) => setAdjustForm((p) => ({ ...p, userId: e.target.value }))} placeholder="User ID" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input value={adjustForm.amount} onChange={(e) => setAdjustForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" type="number" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <select value={adjustForm.type} onChange={(e) => setAdjustForm((p) => ({ ...p, type: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            <input value={adjustForm.reason} onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setAdjustOpen(false)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted">Cancel</button>
            <button onClick={() => setConfirmOpen(true)} className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black">Review & Confirm</button>
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        open={confirmOpen}
        title="Confirm Wallet Adjustment"
        description="This action updates a user wallet and writes to the audit ledger. Proceed only after validation."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => adjustMutation.mutate()}
        loading={adjustMutation.isPending}
        confirmText="Apply Adjustment"
      />

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(pagination.page || 1) <= 1} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Previous</button>
        <button onClick={() => setPage((p) => ((pagination.totalPages || 1) > p ? p + 1 : p))} disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
