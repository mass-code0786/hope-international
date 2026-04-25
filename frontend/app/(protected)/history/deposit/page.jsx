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
import { depositStatusLabel, depositStatusMessage } from '@/lib/utils/depositStatus';

export default function DepositHistoryPage() {
  const depositsQuery = useQuery({ queryKey: queryKeys.walletDeposits, queryFn: getDepositHistory });

  if (depositsQuery.isError) {
    return <ErrorState message="Deposit history is unavailable right now." onRetry={depositsQuery.refetch} />;
  }

  const envelope = depositsQuery.data || {};
  const deposits = Array.isArray(envelope.data) ? envelope.data : [];

  return (
    <div className="space-y-3">
      <SectionHeader title="USDT Deposit History" subtitle="NOWPayments records, newest first" action={<Link href="/deposit" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">New Deposit</Link>} />
      {!deposits.length ? (
        <EmptyState title="No deposits found" description="Once you create a NOWPayments deposit, it will appear here." />
      ) : (
        <div className="space-y-2">
          {deposits.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{currency(item.amount)}</p>
                <Badge variant={statusVariant(item.status_key || item.status)}>{item.status_label || depositStatusLabel(item.status)}</Badge>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-600">NOWPayments | {item.network || 'BSC/BEP20'} | {dateTime(item.created_at)}</p>
              <p className="mt-1 text-[11px] text-slate-700">{item.status_message || depositStatusMessage(item)}</p>
              <p className="mt-1 text-[11px] text-slate-700">
                Payment Status: {String(item.payment_status || 'waiting').toUpperCase()}
                {item.pay_amount ? ` | Pay ${item.pay_amount} ${String(item.pay_currency || '').toUpperCase()}` : ''}
              </p>
              {item.wallet_address_snapshot ? <p className="mt-1 text-[11px] text-slate-700">Payment Address: {item.wallet_address_snapshot}</p> : null}
              {item.payment_record_id ? <Link href={`/payments/${item.payment_record_id}`} className="mt-2 inline-flex text-[11px] font-semibold text-sky-700">Open payment status</Link> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

