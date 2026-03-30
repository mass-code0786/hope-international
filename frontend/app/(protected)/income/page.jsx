'use client';

import { useMemo, useState } from 'react';
import { Download, Filter, Trophy } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { IncomeList } from '@/components/income/IncomeList';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IncomeSkeleton } from '@/components/ui/PageSkeletons';
import { useWallet } from '@/hooks/useWallet';
import { currency, incomeSourceLabel } from '@/lib/utils/format';
import { IncomeSummaryStrip } from '@/components/income/IncomeSummaryStrip';

const filters = ['all', 'direct_income', 'matching_income', 'reward_qualification', 'cap_overflow'];

export default function IncomePage() {
  const { data, isLoading, isError, refetch } = useWallet();
  const [filter, setFilter] = useState('all');
  const transactions = Array.isArray(data?.transactions) ? data.transactions : [];

  const filteredTransactions = useMemo(() => transactions.filter((tx) => (filter === 'all' ? true : tx?.source === filter)), [transactions, filter]);

  const direct = transactions.filter((t) => t?.source === 'direct_income' && t?.tx_type === 'credit').reduce((s, t) => s + Number(t?.amount || 0), 0);
  const matching = transactions.filter((t) => t?.source === 'matching_income' && t?.tx_type === 'credit').reduce((s, t) => s + Number(t?.amount || 0), 0);
  const reward = transactions.filter((t) => t?.source === 'reward_qualification' && t?.tx_type === 'credit').reduce((s, t) => s + Number(t?.amount || 0), 0);
  const overflow = transactions.filter((t) => t?.source === 'cap_overflow').reduce((s, t) => s + Number(t?.amount || 0), 0);

  if (isLoading) return <IncomeSkeleton />;
  if (isError) return <ErrorState message="Income records are unavailable right now." onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <SectionHeader title="Income Center" subtitle="A clearer earnings breakdown built directly from your live wallet ledger and compensation entries." action={<button className="hope-button-secondary"><Download size={15} /> Export</button>} />

      <div className="card-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="hope-kicker mb-3"><Filter size={12} /> Earnings overview</span>
            <h3 className="text-xl font-semibold tracking-[-0.04em] text-text">Your income snapshot</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Use the tabs below to switch between direct, matching, rewards, and other ledger activity without losing context.</p>
          </div>
          <div className="rounded-[24px] border border-[var(--hope-border)] bg-cardSoft px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Visible total</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text">{currency(direct + matching + reward)}</p>
          </div>
        </div>
      </div>

      <IncomeSummaryStrip direct={direct} matching={matching} reward={reward} overflow={overflow} />

      {reward > 0 ? (
        <div className="card-surface p-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent"><Trophy size={18} /></div>
            <div>
              <p className="text-sm font-semibold text-text">Reward income detected</p>
              <p className="mt-1 text-sm leading-6 text-muted">You already have reward-related credits in your ledger. Use the reward filter to review those entries separately.</p>
            </div>
          </div>
        </div>
      ) : null}

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
        <EmptyState title="No income yet" description="Income entries will appear here after direct, matching, reward, or related wallet credits are recorded for your account." />
      )}
    </div>
  );
}
