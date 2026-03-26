import { Badge } from '@/components/ui/Badge';
import { currency, number, orderStatusLabel, orderStatusVariant, shortDate } from '@/lib/utils/format';

export function OrderList({ orders = [] }) {
  const safeOrders = Array.isArray(orders) ? orders : [];

  return (
    <div className="card-surface overflow-hidden">
      <div className="border-b border-white/10 p-4 text-sm text-muted">Order History</div>
      <div className="divide-y divide-white/5">
        {safeOrders.map((order, idx) => (
          <div key={order?.id || idx} className="grid grid-cols-1 gap-2 p-4 md:grid-cols-5 md:items-center">
            <div className="text-sm text-text">#{(order?.id || 'N/A').slice(0, 8)}</div>
            <div><Badge variant={orderStatusVariant(order?.status)}>{orderStatusLabel(order?.status)}</Badge></div>
            <div className="text-sm text-text">{currency(order?.total_amount)}</div>
            <div className="text-xs text-muted">BV {number(order?.total_bv)} | PV {number(order?.total_pv)}</div>
            <div className="text-xs text-muted">{shortDate(order?.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
