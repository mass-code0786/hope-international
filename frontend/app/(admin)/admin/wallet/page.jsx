'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { FilterBar } from '@/components/admin/FilterBar';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmationModal } from '@/components/admin/ConfirmationModal';
import { ErrorState } from '@/components/ui/ErrorState';
import BtctCoinLogo from '@/components/common/BtctCoinLogo';
import { queryKeys } from '@/lib/query/queryKeys';
import { canAccessSuperAdminArea } from '@/lib/constants/access';
import {
  createManualWalletAdjustment,
  freezeAdminWallet,
  getAdminBtctStaking,
  getAdminWalletLogs,
  getAdminWalletSummary,
  getAdminWalletTransactions,
  getAdminWalletUser,
  getAdminWalletUsers,
  runAdminBtctStakingPayouts,
  unfreezeAdminWallet
} from '@/lib/services/admin';
import { currency, formatLabel, incomeSourceLabel, number, shortDate } from '@/lib/utils/format';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const walletOptions = [
  { value: 'deposit_wallet', label: 'Deposit Wallet', freezeKey: 'deposit_wallet_frozen' },
  { value: 'income_wallet', label: 'Income Wallet', freezeKey: 'income_wallet_frozen' },
  { value: 'bonus_wallet', label: 'Bonus Wallet', freezeKey: 'bonus_wallet_frozen' }
];

export default function AdminWalletPage() {
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUser();
  const superAdmin = canAccessSuperAdminArea(currentUserQuery.data);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [search, setSearch] = useState('');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [freezeConfirm, setFreezeConfirm] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    userId: '',
    walletType: 'deposit_wallet',
    amount: '',
    type: 'credit',
    reason: ''
  });

  const txQuery = useQuery({
    queryKey: [...queryKeys.adminWalletTransactions, filter, page],
    queryFn: () => getAdminWalletTransactions({ source: filter, page, limit: 15 })
  });
  const summaryQuery = useQuery({ queryKey: queryKeys.adminWalletSummary, queryFn: getAdminWalletSummary });
  const stakingQuery = useQuery({ queryKey: queryKeys.adminBtctStaking, queryFn: getAdminBtctStaking });
  const usersQuery = useQuery({
    queryKey: [...queryKeys.adminWalletUsers, search, userPage],
    queryFn: () => getAdminWalletUsers({ search, page: userPage, limit: 10 })
  });
  const walletUserQuery = useQuery({
    queryKey: queryKeys.adminWalletUser(adjustForm.userId || 'none'),
    queryFn: () => getAdminWalletUser(adjustForm.userId),
    enabled: Boolean(adjustForm.userId)
  });
  const logsQuery = useQuery({
    queryKey: [...queryKeys.adminWalletLogs, logPage],
    queryFn: () => getAdminWalletLogs({ page: logPage, limit: 10 })
  });

  const refetchWalletAdminData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.adminWallet }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletUsers }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletLogs }),
      adjustForm.userId ? queryClient.invalidateQueries({ queryKey: queryKeys.adminWalletUser(adjustForm.userId) }) : Promise.resolve()
    ]);
  };

  const adjustMutation = useMutation({
    mutationFn: () => createManualWalletAdjustment({ ...adjustForm, amount: Number(adjustForm.amount || 0) }),
    onSuccess: async (result) => {
      toast.success(result.message || 'Wallet adjustment posted');
      setConfirmOpen(false);
      setAdjustOpen(false);
      setAdjustForm({ userId: '', walletType: 'deposit_wallet', amount: '', type: 'credit', reason: '' });
      await refetchWalletAdminData();
    },
    onError: (err) => toast.error(err.message || 'Adjustment failed')
  });

  const freezeMutation = useMutation({
    mutationFn: async ({ freeze, payload }) => (freeze ? freezeAdminWallet(payload) : unfreezeAdminWallet(payload)),
    onSuccess: async (result) => {
      toast.success(result.message || 'Wallet freeze state updated');
      setFreezeConfirm(null);
      await refetchWalletAdminData();
    },
    onError: (err) => toast.error(err.message || 'Wallet freeze update failed')
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

  if (txQuery.isLoading || summaryQuery.isLoading || stakingQuery.isLoading || usersQuery.isLoading || logsQuery.isLoading) return null;
  if (txQuery.isError) return <ErrorState message="Unable to load wallet ledger." onRetry={txQuery.refetch} />;
  if (summaryQuery.isError) return <ErrorState message="Unable to load wallet summary." onRetry={summaryQuery.refetch} />;
  if (stakingQuery.isError) return <ErrorState message="Unable to load BTCT staking data." onRetry={stakingQuery.refetch} />;
  if (usersQuery.isError) return <ErrorState message="Unable to load wallet users." onRetry={usersQuery.refetch} />;
  if (logsQuery.isError) return <ErrorState message="Unable to load admin wallet logs." onRetry={logsQuery.refetch} />;

  const txEnvelope = txQuery.data || {};
  const txs = Array.isArray(txEnvelope.data) ? txEnvelope.data : [];
  const pagination = txEnvelope.pagination || {};
  const summary = summaryQuery.data?.data || {};
  const stakingData = stakingQuery.data?.data || {};
  const stakingPlans = Array.isArray(stakingData.plans) ? stakingData.plans : [];
  const stakingPayouts = Array.isArray(stakingData.payouts) ? stakingData.payouts : [];
  const usersEnvelope = usersQuery.data || {};
  const walletUsers = Array.isArray(usersEnvelope.data) ? usersEnvelope.data : [];
  const logsEnvelope = logsQuery.data || {};
  const walletLogs = Array.isArray(logsEnvelope.data) ? logsEnvelope.data : [];
  const selectedWalletUser = walletUserQuery.data?.data || null;

  const selectedWalletCards = useMemo(() => {
    if (!selectedWalletUser) return [];
    return [
      { key: 'deposit_wallet', label: 'Deposit Wallet', balance: Number(selectedWalletUser.deposit_balance || 0), frozen: Boolean(selectedWalletUser.deposit_wallet_frozen) },
      { key: 'income_wallet', label: 'Income Wallet', balance: Number(selectedWalletUser.income_balance || 0), frozen: Boolean(selectedWalletUser.income_wallet_frozen) },
      { key: 'bonus_wallet', label: 'Bonus Wallet', balance: Number(selectedWalletUser.bonus_balance || selectedWalletUser.auction_bonus_balance || 0), frozen: Boolean(selectedWalletUser.bonus_wallet_frozen) }
    ];
  }, [selectedWalletUser]);

  return (
    <div className="space-y-5">
      <AdminSectionHeader
        title="Wallet Operations"
        subtitle="Admin wallet oversight, manual wallet control, wallet freeze safety, and audit visibility"
        action={(
          <div className="flex gap-2">
            <button onClick={() => runPayoutsMutation.mutate()} disabled={runPayoutsMutation.isPending} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-text disabled:opacity-60">
              <span className="inline-flex items-center gap-2">
                <BtctCoinLogo size={16} className="shrink-0" />
                {runPayoutsMutation.isPending ? 'Running payouts...' : 'Run BTCT Payouts'}
              </span>
            </button>
            {superAdmin ? (
              <button onClick={() => setAdjustOpen(true)} className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black">
                Wallet Adjustment
              </button>
            ) : null}
          </div>
        )}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card-surface p-4 text-sm">Total credits: <span className="font-semibold text-text">{currency(summary.total_credits)}</span></div>
        <div className="card-surface p-4 text-sm">Total debits: <span className="font-semibold text-text">{currency(summary.total_debits)}</span></div>
        <div className="card-surface p-4 text-sm">Wallet users: <span className="font-semibold text-text">{usersEnvelope.pagination?.total || walletUsers.length}</span></div>
        <div className="card-surface p-4 text-sm">Wallet logs: <span className="font-semibold text-text">{logsEnvelope.pagination?.total || walletLogs.length}</span></div>
      </div>

      <FilterBar>
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setUserPage(1);
          }}
          placeholder="Search by username, email, or user ID"
          className="min-w-[260px] rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text"
        />
      </FilterBar>

      <DataTable
        columns={[
          { key: 'user', title: 'User', className: 'col-span-3', render: (row) => `${row.username || '-'}${row.email ? ` · ${row.email}` : ''}` },
          { key: 'deposit_balance', title: 'Deposit', className: 'col-span-2', render: (row) => currency(row.deposit_balance || 0) },
          { key: 'income_balance', title: 'Income', className: 'col-span-2', render: (row) => currency(row.income_balance || 0) },
          { key: 'bonus_balance', title: 'Bonus', className: 'col-span-1', render: (row) => currency(row.bonus_balance || 0) },
          { key: 'actions', title: 'Actions', className: 'col-span-2', render: (row) => (
            <button
              onClick={() => {
                setAdjustForm((prev) => ({ ...prev, userId: row.id }));
                if (superAdmin) {
                  setAdjustOpen(true);
                }
              }}
              className="rounded-lg border border-white/10 px-2 py-1 text-xs text-text"
            >
              {superAdmin ? 'Manage' : 'Select'}
            </button>
          ) }
        ]}
        rows={walletUsers}
      />

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={(usersEnvelope.pagination?.page || 1) <= 1} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Previous</button>
        <button onClick={() => setUserPage((p) => ((usersEnvelope.pagination?.totalPages || 1) > p ? p + 1 : p))} disabled={(usersEnvelope.pagination?.page || 1) >= (usersEnvelope.pagination?.totalPages || 1)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Next</button>
      </div>

      {selectedWalletUser ? (
        <div className="card-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-text">Selected User Wallets</h4>
              <p className="mt-1 text-xs text-muted">{selectedWalletUser.username} · {selectedWalletUser.email}</p>
            </div>
            <p className="text-xs text-muted">User ID: {selectedWalletUser.id}</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {selectedWalletCards.map((wallet) => (
              <div key={wallet.key} className="rounded-2xl border border-white/10 bg-cardSoft p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text">{wallet.label}</p>
                  <StatusBadge status={wallet.frozen ? 'inactive' : 'active'} />
                </div>
                <p className="mt-2 text-lg font-semibold text-text">{currency(wallet.balance)}</p>
                <button
                  onClick={() => setFreezeConfirm({
                    userId: selectedWalletUser.id,
                    walletType: wallet.key,
                    freeze: !wallet.frozen,
                    reason: `${wallet.frozen ? 'Unfreeze' : 'Freeze'} ${wallet.label} for admin wallet control`
                  })}
                  className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${wallet.frozen ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}
                >
                  {wallet.frozen ? 'Unfreeze Wallet' : 'Freeze Wallet'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card-surface p-4">
        <h4 className="text-sm font-semibold text-text">Admin Wallet Action Logs</h4>
        <DataTable
          columns={[
            { key: 'target_username', title: 'User', className: 'col-span-2', render: (row) => row.target_username || row.target_user_id },
            { key: 'wallet_type', title: 'Wallet', className: 'col-span-2', render: (row) => formatLabel(row.wallet_type) },
            { key: 'action_type', title: 'Action', className: 'col-span-2', render: (row) => formatLabel(row.action_type) },
            { key: 'amount', title: 'Amount', className: 'col-span-2', render: (row) => row.amount ? currency(row.amount) : '-' },
            { key: 'admin_username', title: 'Admin', className: 'col-span-2', render: (row) => row.admin_username || row.admin_user_id },
            { key: 'created_at', title: 'Date', className: 'col-span-2', render: (row) => shortDate(row.created_at) }
          ]}
          rows={walletLogs}
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={() => setLogPage((p) => Math.max(1, p - 1))} disabled={(logsEnvelope.pagination?.page || 1) <= 1} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Previous</button>
          <button onClick={() => setLogPage((p) => ((logsEnvelope.pagination?.totalPages || 1) > p ? p + 1 : p))} disabled={(logsEnvelope.pagination?.page || 1) >= (logsEnvelope.pagination?.totalPages || 1)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Next</button>
        </div>
      </div>

      <div className="card-surface p-4">
        <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-text"><BtctCoinLogo size={17} className="shrink-0" />BTCT Staking Plans</h4>
        <DataTable
          columns={[
            { key: 'user', title: 'User', className: 'col-span-2', render: (row) => row.username || row.user_id },
            { key: 'staking_amount_btct', title: 'Locked BTCT', className: 'col-span-2', render: (row) => <span className="inline-flex items-center gap-1.5"><BtctCoinLogo size={14} className="shrink-0" />{number(row.staking_amount_btct)}</span> },
            { key: 'staked_blocks', title: 'Blocks', className: 'col-span-2', render: (row) => number(row.staked_blocks || 0) },
            { key: 'payout_per_cycle_usd', title: 'Per Cycle', className: 'col-span-2', render: (row) => currency(row.payout_per_cycle_usd || row.reward_amount_usd) },
            { key: 'next_payout_at', title: 'Next Payout', className: 'col-span-2', render: (row) => shortDate(row.next_payout_at) },
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
            { key: 'cycle_key', title: 'Cycle Date', className: 'col-span-2', render: (row) => row.cycle_key || shortDate(row.payout_date) },
            { key: 'payout_amount_usd', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.payout_amount_usd) },
            { key: 'credited_to', title: 'Credited To', className: 'col-span-2', render: (row) => formatLabel(row.credited_to || 'income_wallet') },
            { key: 'payout_date', title: 'Payout Date', className: 'col-span-2', render: (row) => shortDate(row.payout_date) }
          ]}
          rows={stakingPayouts}
        />
      </div>

      <FilterBar>
        {['all', 'direct_income', 'direct_deposit_income', 'level_deposit_income', 'matching_income', 'reward_qualification', 'cap_overflow', 'manual_adjustment', 'btct_staking_payout'].map((source) => (
          <button key={source} onClick={() => setFilter(source)} className={`rounded-full px-3 py-2 text-xs ${filter === source ? 'bg-accent text-black' : 'bg-white/5 text-muted'}`}>
            {source === 'all' ? 'All' : incomeSourceLabel(source)}
          </button>
        ))}
      </FilterBar>

      <DataTable
        columns={[
          { key: 'user_id', title: 'User', className: 'col-span-2', render: (row) => row.username || `#${String(row.user_id).slice(0, 8)}` },
          { key: 'source', title: 'Source', className: 'col-span-3', render: (row) => incomeSourceLabel(row.source) },
          { key: 'tx_type', title: 'Type', className: 'col-span-2', render: (row) => <StatusBadge status={row.tx_type} /> },
          { key: 'amount', title: 'Amount', className: 'col-span-2', render: (row) => currency(row.amount) },
          { key: 'created_at', title: 'Date', className: 'col-span-2', render: (row) => shortDate(row.created_at) },
          { key: 'meta', title: 'Meta', className: 'col-span-1', render: (row) => row.metadata?.note || row.metadata?.reason || (row.metadata?.walletType ? formatLabel(row.metadata.walletType) : '-') }
        ]}
        rows={txs}
      />

      {superAdmin && adjustOpen ? (
        <div className="card-surface p-4">
          <h4 className="text-sm font-semibold text-text">Manual Wallet Adjustment</h4>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input value={adjustForm.userId} onChange={(e) => setAdjustForm((p) => ({ ...p, userId: e.target.value }))} placeholder="User ID" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <select value={adjustForm.walletType} onChange={(e) => setAdjustForm((p) => ({ ...p, walletType: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
              {walletOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input value={adjustForm.amount} onChange={(e) => setAdjustForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Amount" type="number" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <select value={adjustForm.type} onChange={(e) => setAdjustForm((p) => ({ ...p, type: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
              <option value="credit">Add Balance</option>
              <option value="debit">Deduct Balance</option>
            </select>
            <input value={adjustForm.reason} onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason / note" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm md:col-span-2" />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setAdjustOpen(false)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted">Cancel</button>
            <button onClick={() => setConfirmOpen(true)} className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black">Review & Confirm</button>
          </div>
        </div>
      ) : null}

      {superAdmin ? (
        <ConfirmationModal
          open={confirmOpen}
          title="Confirm Wallet Adjustment"
          description="This action updates a specific user wallet and writes to the admin wallet audit log."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => adjustMutation.mutate()}
          loading={adjustMutation.isPending}
          confirmText="Apply Adjustment"
        />
      ) : null}

      <ConfirmationModal
        open={Boolean(freezeConfirm)}
        title={freezeConfirm?.freeze ? 'Freeze Wallet' : 'Unfreeze Wallet'}
        description="This action changes wallet availability for transfers and withdrawals and writes to the admin wallet audit log."
        onCancel={() => setFreezeConfirm(null)}
        onConfirm={() => freezeMutation.mutate({ freeze: Boolean(freezeConfirm?.freeze), payload: freezeConfirm })}
        loading={freezeMutation.isPending}
        confirmText={freezeConfirm?.freeze ? 'Freeze Wallet' : 'Unfreeze Wallet'}
      />

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={(pagination.page || 1) <= 1} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Previous</button>
        <button onClick={() => setPage((p) => ((pagination.totalPages || 1) > p ? p + 1 : p))} disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
