import { StatCard } from '@/components/ui/StatCard';
import { number } from '@/lib/utils/format';

export function BinaryCard({ leftPv, rightPv, matchedPv, className = '', emphasis = 'primary' }) {
  return (
    <StatCard
      title="Binary PV"
      value={`${number(leftPv)} / ${number(rightPv)}`}
      subtitle={`Matched PV: ${number(matchedPv)} | Weekly cycle resets carry to zero`}
      className={className}
      emphasis={emphasis}
    />
  );
}
