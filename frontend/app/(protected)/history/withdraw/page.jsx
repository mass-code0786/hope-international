'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { getWithdrawalHistory } from '@/lib/services/walletService';
import { currency, dateTime, statusVariant } from '@/lib/utils/format';

export default function WithdrawalHistoryPage() {
  const withdrawalsQuery = useQuery({ queryKey: queryKeys.walletWithdrawals, queryFn: getWithdrawalHistory });

  if (withdrawalsQuery.isError) {
    return <ErrorState message="Withdrawal history is unavailable right now." onRetry={withdrawalsQuery.refetch} />;
  }

  const withdrawals = Array.isArray(withdrawalsQuery.data) ? withdrawalsQuery.data : [];

  return (
    <div className="space-y-3">
      <SectionHeader title="Withdrawal History" subtitle="Newest requests first" action={<Link href="/withdraw" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">New Withdrawal</Link>} />
      {!withdrawals.length ? (
        <EmptyState title="No withdrawal requests found" description="Submitted withdrawal requests will appear here." />
      ) : (
        <div className="space-y-2">
          {withdrawals.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{currency(item.amount)}</p>
                <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{item.network || 'network'} - {dateTime(item.created_at)}</p>
              <p className="mt-1 break-all text-[11px] text-slate-600">{item.wallet_address}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

