import { Badge } from '@/components/ui/Badge';

export function StatusBadge({ status }) {
  const lower = String(status || '').toLowerCase();
  const variant = lower === 'paid' || lower === 'qualified' || lower === 'active' || lower === 'processed' || lower === 'approved' || lower === 'completed'
    ? 'success'
    : lower === 'cancelled' || lower === 'inactive' || lower === 'failed' || lower === 'rejected'
      ? 'danger'
      : lower === 'pending' || lower === 'processing'
        ? 'warning'
        : 'accent';

  return <Badge variant={variant}>{status || 'Unknown'}</Badge>;
}

