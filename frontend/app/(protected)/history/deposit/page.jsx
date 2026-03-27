'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { getDepositHistory } from '@/lib/services/walletService';
import { currency, dateTime, statusVariant } from '@/lib/utils/format';

export default function DepositHistoryPage() {
  const depositsQuery = useQuery({ queryKey: queryKeys.walletDeposits, queryFn: getDepositHistory });

  if (depositsQuery.isError) {
    return <ErrorState message="Deposit history is unavailable right now." onRetry={depositsQuery.refetch} />;
  }

  const deposits = Array.isArray(depositsQuery.data) ? depositsQuery.data : [];

  return (
    <div className="space-y-3">
      <SectionHeader title="Deposit History" subtitle="Newest requests first" action={<Link href="/deposit" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">New Deposit</Link>} />
      {!deposits.length ? (
        <EmptyState title="No deposit requests found" description="Once you submit a deposit request, it will appear here." />
      ) : (
        <div className="space-y-2">
          {deposits.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{currency(item.amount)}</p>
                <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{item.method || 'manual'} - {dateTime(item.created_at)}</p>
              {item.instructions ? <p className="mt-1 text-[11px] text-slate-600">{item.instructions}</p> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

