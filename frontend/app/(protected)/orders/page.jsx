'use client';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { OrderList } from '@/components/orders/OrderList';
import { useOrders } from '@/hooks/useOrders';
import { PageLoadingState } from '@/components/ui/PageLoadingState';

export default function OrdersPage() {
  const { data, isLoading, isError, refetch } = useOrders();
  const orders = Array.isArray(data) ? data : [];

  if (isLoading) return <PageLoadingState title="Orders" subtitle="Loading your recent orders." />;
  if (isError) return <ErrorState message="Unable to fetch orders at the moment." onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <SectionHeader title="Orders" subtitle="Track purchases, BV and PV history" />
      {orders.length === 0 ? <EmptyState title="No orders yet" description="Place your first order to start building PV and BV." /> : null}
      {orders.length ? <OrderList orders={orders} /> : null}
    </div>
  );
}
