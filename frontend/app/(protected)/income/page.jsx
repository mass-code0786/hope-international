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
    <div className="space-y-3">
      <SectionHeader
        title="Income Center"
        subtitle="Earnings and transaction audit"
        action={<button className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-500">Export</button>}
      />

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard compact title="Total" value={currency(direct + matching + reward)} emphasis="primary" />
        <StatCard compact title="Direct" value={currency(direct)} />
        <StatCard compact title="Matching" value={currency(matching)} />
        <StatCard compact title="Reward" value={currency(reward)} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10px] ${filter === item ? 'bg-sky-100 text-sky-700' : 'border border-slate-200 bg-white text-slate-600'}`}
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
