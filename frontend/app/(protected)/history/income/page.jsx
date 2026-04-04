'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { getWallet } from '@/lib/services/walletService';
import { currency, dateTime, incomeSourceLabel, statusVariant } from '@/lib/utils/format';

const filters = [
  { key: 'all', label: 'All' },
  { key: 'direct', label: 'Direct' },
  { key: 'level', label: 'Level' },
  { key: 'matching', label: 'Matching' },
  { key: 'rewards', label: 'Rewards' }
];

function matchesFilter(item, filter) {
  if (filter === 'all') return true;
  if (filter === 'direct') return ['direct_income', 'direct_deposit_income'].includes(item?.source);
  if (filter === 'level') return item?.source === 'level_deposit_income';
  if (filter === 'matching') return item?.source === 'matching_income';
  if (filter === 'rewards') return item?.source === 'reward_qualification';
  return true;
}

export default function IncomeHistoryPage() {
  const walletQuery = useQuery({ queryKey: queryKeys.wallet, queryFn: getWallet });
  const [filter, setFilter] = useState('all');

  if (walletQuery.isError) {
    return <ErrorState message="Income history is unavailable right now." onRetry={walletQuery.refetch} />;
  }

  const incomeTransactions = useMemo(
    () => (Array.isArray(walletQuery.data?.incomeTransactions) ? walletQuery.data.incomeTransactions : []),
    [walletQuery.data?.incomeTransactions]
  );
  const filteredTransactions = useMemo(
    () => incomeTransactions.filter((item) => matchesFilter(item, filter)),
    [incomeTransactions, filter]
  );

  return (
    <div className="space-y-3">
      <SectionHeader
        title="All Income History"
        subtitle="Credited income only. Deposit requests stay inside deposit history."
        action={<Link href="/income" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">Income Dashboard</Link>}
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${filter === item.key ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!filteredTransactions.length ? (
        <EmptyState title="No income entries found" description="Credits and plan earnings will appear here." />
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((item) => {
            const status = item.ledger_status || item.metadata?.status || 'approved';
            const sourceName = item.source_username || item.metadata?.sourceUsername || '-';
            const depositAmount = item.source_deposit_amount || item.metadata?.baseAmount || 0;
            const levelNumber = item.level_number || item.metadata?.levelNumber || null;

            return (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{currency(item.amount)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{incomeSourceLabel(item.source)}</p>
                  </div>
                  <Badge variant={statusVariant(status)}>{status}</Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>
                    <p className="text-slate-400">Source Username</p>
                    <p className="mt-0.5 font-medium text-slate-800">{sourceName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Level Number</p>
                    <p className="mt-0.5 font-medium text-slate-800">{levelNumber ? `Level ${levelNumber}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Deposit Amount</p>
                    <p className="mt-0.5 font-medium text-slate-800">{depositAmount ? currency(depositAmount) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Credited Date/Time</p>
                    <p className="mt-0.5 font-medium text-slate-800">{dateTime(item.created_at)}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
