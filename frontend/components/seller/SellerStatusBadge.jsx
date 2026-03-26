import { Badge } from '@/components/ui/Badge';
import { sellerApplicationStatusLabel, statusVariant, moderationStatusLabel } from '@/lib/utils/format';

export function SellerStatusBadge({ status, kind = 'application' }) {
  const label = kind === 'moderation' ? moderationStatusLabel(status) : sellerApplicationStatusLabel(status);
  const variant = statusVariant(status);
  return <Badge variant={variant}>{label}</Badge>;
}
