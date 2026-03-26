'use client';

import { useMemo, useState } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { IncomeList } from '@/components/income/IncomeList';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IncomeSkeleton } from '@/components/ui/PageSkeletons';
import { useWallet } from '@/hooks/useWallet';
import { currency, incomeSourceLabel } from '@/lib/utils/format';

const filters = ['all', 'direct_income', 'matching_income', 'reward_qualification', 'cap_overflow'];

export default function IncomePage() {
  const { data, isLoading, isError, refetch } = useWallet();
  const [filter, setFilter] = useState('all');
  const transactions = Array.isArray(data?.transactions) ? data.transactions : [];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => (filter === 'all' ? true : tx?.source === filter));
  }, [transactions, filter]);

  const direct = transactions
    .filter((t) => t?.source === 'direct_income' && t?.tx_type === 'credit')
    .reduce((s, t) => s + Number(t?.amount || 0), 0);
  const matching = transactions
    .filter((t) => t?.source === 'matching_income' && t?.tx_type === 'credit')
    .reduce((s, t) => s + Number(t?.amount || 0), 0);
  const reward = transactions
    .filter((t) => t?.source === 'reward_qualification' && t?.tx_type === 'credit')
    .reduce((s, t) => s + Number(t?.amount || 0), 0);

  if (isLoading) return <IncomeSkeleton />;
  if (isError) return <ErrorState message="Income records are unavailable right now." onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Income Center"
        subtitle="Direct, matching, reward and cap audit entries"
        action={<button className="rounded-xl border border-white/10 px-3 py-2 text-xs text-muted">Export (Soon)</button>}
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Earnings" value={currency(direct + matching + reward)} emphasis="primary" />
        <StatCard title="Direct Income" value={currency(direct)} />
        <StatCard title="Matching Income" value={currency(matching)} />
        <StatCard title="Reward Income" value={currency(reward)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs ${filter === item ? 'bg-accent text-black' : 'bg-white/5 text-muted'}`}
          >
            {item === 'all' ? 'All' : incomeSourceLabel(item)}
          </button>
        ))}
      </div>

      {filteredTransactions.length ? (
        <IncomeList transactions={filteredTransactions} />
      ) : (
        <EmptyState
          title="No matching transactions"
          description="No ledger entries match the selected filter in this period."
        />
      )}
    </div>
  );
}
