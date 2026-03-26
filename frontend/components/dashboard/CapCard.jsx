import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { currency, number } from '@/lib/utils/format';

export function CapCard({ selfPv, multiplier, cap, earned, className = '', emphasis = 'primary' }) {
  const remaining = Math.max(0, Number(cap || 0) - Number(earned || 0));
  const progress = cap > 0 ? (Number(earned || 0) / Number(cap || 1)) * 100 : 0;

  return (
    <StatCard
      title="Weekly Cap"
      value={currency(cap)}
      subtitle={`Self PV ${number(selfPv)} x ${multiplier} = cap | Remaining ${currency(remaining)}`}
      right={<div className="w-28"><ProgressBar value={progress} /></div>}
      className={className}
      emphasis={emphasis}
    />
  );
}
