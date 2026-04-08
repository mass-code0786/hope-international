'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { IncomeList } from '@/components/income/IncomeList';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IncomeSkeleton } from '@/components/ui/PageSkeletons';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/queryKeys';
import { getWalletWithHistory } from '@/lib/services/walletService';
import { incomeSourceLabel } from '@/lib/utils/format';
import { IncomeSummaryStrip } from '@/components/income/IncomeSummaryStrip';

const filters = ['all', 'direct_income', 'direct_deposit_income', 'level_deposit_income', 'matching_income', 'reward_qualification', 'cap_overflow'];

export default function IncomePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...queryKeys.wallet, 'history'],
    queryFn: getWalletWithHistory,
    staleTime: 20_000,
    refetchOnWindowFocus: false
  });
  const [filter, setFilter] = useState('all');
  const transactions = Array.isArray(data?.incomeTransactions) ? data.incomeTransactions : [];

  const filteredTransactions = useMemo(() => transactions.filter((tx) => (filter === 'all' ? true : tx?.source === filter)), [transactions, filter]);

  const direct = transactions.filter((t) => t?.source === 'direct_income' && t?.tx_type === 'credit').reduce((s, t) => s + Number(t?.amount || 0), 0);
  const matching = transactions.filter((t) => t?.source === 'matching_income' && t?.tx_type === 'credit').reduce((s, t) => s + Number(t?.amount || 0), 0);
  const reward = transactions.filter((t) => t?.source === 'reward_qualification' && t?.tx_type === 'credit').reduce((s, t) => s + Number(t?.amount || 0), 0);
  const overflow = transactions.filter((t) => t?.source === 'cap_overflow').reduce((s, t) => s + Number(t?.amount || 0), 0);

  if (isLoading) return <IncomeSkeleton />;
  if (isError) return <ErrorState message="Income records are unavailable right now." onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <SectionHeader title="Income" action={<button className="hope-button-secondary"><Download size={15} /> Export</button>} />

      <IncomeSummaryStrip direct={direct} matching={matching} reward={reward} overflow={overflow} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${filter === item ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-900' : 'border border-[var(--hope-border)] bg-card text-muted'}`}>
            {item === 'all' ? 'All' : incomeSourceLabel(item)}
          </button>
        ))}
      </div>

      {filteredTransactions.length ? (
        <IncomeList transactions={filteredTransactions} />
      ) : (
        <EmptyState title="No income yet" description="Income entries will appear here when available." />
      )}
    </div>
  );
}
