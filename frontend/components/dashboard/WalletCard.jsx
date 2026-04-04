import { StatCard } from '@/components/ui/StatCard';
import { currency, formatLabel } from '@/lib/utils/format';

export function WalletCard({ balance, className = '', emphasis = 'primary' }) {
  return <StatCard title={formatLabel('Wallet Balance')} value={currency(balance)} subtitle={formatLabel('Available balance')} className={className} emphasis={emphasis} uppercaseTitle={false} />;
}
