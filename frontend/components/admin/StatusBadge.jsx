import { Badge } from '@/components/ui/Badge';

export function StatusBadge({ status }) {
  const lower = String(status || '').toLowerCase();
  const variant = lower === 'paid' || lower === 'qualified' || lower === 'active' || lower === 'processed'
    ? 'success'
    : lower === 'cancelled' || lower === 'inactive' || lower === 'failed'
      ? 'danger'
      : 'accent';

  return <Badge variant={variant}>{status || 'Unknown'}</Badge>;
}
