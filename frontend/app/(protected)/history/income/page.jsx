'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { getWallet } from '@/lib/services/walletService';
import { currency, dateTime, incomeSourceLabel, statusVariant, txTypeLabel } from '@/lib/utils/format';

export default function IncomeHistoryPage() {
  const walletQuery = useQuery({ queryKey: queryKeys.wallet, queryFn: getWallet });

  if (walletQuery.isError) {
    return <ErrorState message="Income history is unavailable right now." onRetry={walletQuery.refetch} />;
  }

  const incomeTransactions = useMemo(
    () => (Array.isArray(walletQuery.data?.incomeTransactions) ? walletQuery.data.incomeTransactions : []),
    [walletQuery.data?.incomeTransactions]
  );

  return (
    <div className="space-y-3">
      <SectionHeader title="All Income History" subtitle="Wallet credits and plan-based income streams" action={<Link href="/income" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">Income Dashboard</Link>} />
      {!incomeTransactions.length ? (
        <EmptyState title="No income entries found" description="Credits and plan earnings will appear here." />
      ) : (
        <div className="space-y-2">
          {incomeTransactions.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{currency(item.amount)}</p>
                <Badge variant={statusVariant(item.metadata?.status || 'approved')}>{item.metadata?.status || txTypeLabel(item.tx_type)}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{incomeSourceLabel(item.source)} - {dateTime(item.created_at)}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

