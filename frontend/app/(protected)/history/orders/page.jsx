'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { queryKeys } from '@/lib/query/queryKeys';
import { getOrders } from '@/lib/services/ordersService';
import { currency, dateTime, orderStatusLabel, statusVariant } from '@/lib/utils/format';

const orderFilters = ['all', 'pending', 'paid', 'completed', 'cancelled'];

export default function OrderHistoryPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const ordersQuery = useQuery({ queryKey: queryKeys.orders, queryFn: getOrders });

  if (ordersQuery.isError) {
    return <ErrorState message="Order history is unavailable right now." onRetry={ordersQuery.refetch} />;
  }

  const orders = Array.isArray(ordersQuery.data) ? ordersQuery.data : [];
  const filteredOrders = useMemo(
    () => orders.filter((order) => (statusFilter === 'all' ? true : order?.status === statusFilter)),
    [orders, statusFilter]
  );

  return (
    <div className="space-y-3">
      <SectionHeader title="Order History" subtitle="Active, completed, and cancelled orders" action={<Link href="/shop" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">Shop</Link>} />

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {orderFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] ${statusFilter === filter ? 'bg-sky-100 text-sky-700' : 'border border-slate-200 bg-white text-slate-600'}`}
          >
            {filter === 'all' ? 'All' : orderStatusLabel(filter)}
          </button>
        ))}
      </div>

      {!filteredOrders.length ? (
        <EmptyState title="No orders found" description="Try another status filter or place your first order." />
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <article key={order.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{currency(order.total_amount)}</p>
                <Badge variant={statusVariant(order.status)}>{orderStatusLabel(order.status)}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">#{String(order.id || '').slice(0, 8)} - {dateTime(order.created_at)}</p>
              <p className="mt-1 text-[11px] text-slate-600">BV {order.total_bv || 0} - PV {order.total_pv || 0}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

