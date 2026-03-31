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

  const envelope = depositsQuery.data || {};
  const deposits = Array.isArray(envelope.data) ? envelope.data : [];

  return (
    <div className="space-y-3">
      <SectionHeader title="USDT Deposit History" subtitle="BEP20 requests, newest first" action={<Link href="/deposit" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">New Deposit</Link>} />
      {!deposits.length ? (
        <EmptyState title="No deposit requests found" description="Once you submit a USDT BEP20 deposit, it will appear here." />
      ) : (
        <div className="space-y-2">
          {deposits.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{currency(item.amount)}</p>
                <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-600">{item.asset || 'USDT'} • {item.network || 'BEP20'} • {dateTime(item.created_at)}</p>
              {item.transaction_reference ? <p className="mt-1 text-[11px] text-slate-700">Transaction Hash: {item.transaction_reference}</p> : null}
              {item.sender_wallet_address ? <p className="mt-1 text-[11px] text-slate-700">Sender Wallet: {item.sender_wallet_address}</p> : null}
              {item.note ? <p className="mt-1 text-[11px] text-slate-600">{item.note}</p> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
