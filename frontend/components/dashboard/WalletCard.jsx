import { StatCard } from '@/components/ui/StatCard';
import { currency } from '@/lib/utils/format';

export function WalletCard({ balance, className = '', emphasis = 'primary' }) {
  return <StatCard title="Wallet Balance" value={currency(balance)} subtitle="Available balance" className={className} emphasis={emphasis} />;
}
