import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RANKS } from '@/lib/constants/theme';
import { number, rankLabel } from '@/lib/utils/format';

export function RankCard({ rank, monthlyBv }) {
  const normalizedRank = rankLabel(rank);
  const current = RANKS.find((r) => r.name === normalizedRank) || RANKS[0];
  const idx = RANKS.findIndex((r) => r.name === current.name);
  const next = RANKS[idx + 1];

  const progress = next
    ? ((Number(monthlyBv || 0) - current.minBv) / Math.max(1, next.minBv - current.minBv)) * 100
    : 100;

  return (
    <StatCard
      title="Rank Progress"
      value={current.name}
      subtitle={next ? `Next: ${next.name} at ${number(next.minBv)} BV` : 'Top rank achieved'}
      right={<div className="w-24"><ProgressBar value={progress} color="bg-success" /></div>}
    />
  );
}
