import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { REWARD_SLABS } from '@/lib/constants/theme';
import { currency, number } from '@/lib/utils/format';

export function RewardProgressCard({ monthlyBv, rewardLabel }) {
  const currentBv = Number(monthlyBv || 0);
  const slabs = [...REWARD_SLABS].sort((a, b) => a.thresholdBv - b.thresholdBv);
  const achieved = slabs.filter((s) => currentBv >= s.thresholdBv).pop() || null;
  const next = slabs.find((s) => currentBv < s.thresholdBv) || null;
  const progress = next && next.thresholdBv > 0 ? (currentBv / next.thresholdBv) * 100 : 100;

  return (
    <div className="card-surface border border-white/[0.12] p-5">
      <StatCard
        title="Monthly Rewards"
        value={`${number(currentBv)} BV`}
        subtitle={rewardLabel || achieved?.label || (next ? `Next target: ${next.label}` : 'All milestones completed')}
        right={<div className="w-24"><ProgressBar value={progress} color="bg-accent" /></div>}
        className="border-none bg-transparent p-0 shadow-none"
      />

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-success/[0.22] bg-success/[0.08] p-3">
          <p className="text-[11px] uppercase tracking-wider text-success">Achieved</p>
          <p className="mt-1 text-sm font-semibold text-text">{achieved ? achieved.label : 'No milestone yet'}</p>
          <p className="text-xs text-muted">{achieved ? `${number(achieved.thresholdBv)} BV` : 'Start shopping to unlock rewards'}</p>
        </div>
        <div className="rounded-xl border border-accent/[0.20] bg-accent/[0.08] p-3">
          <p className="text-[11px] uppercase tracking-wider text-accentSoft">Next Milestone</p>
          <p className="mt-1 text-sm font-semibold text-text">{next ? next.label : 'Highest milestone reached'}</p>
          <p className="text-xs text-muted">
            {next ? `${number(next.thresholdBv)} BV | ${currency(next.rewardAmount)}` : 'No further target'}
          </p>
        </div>
      </div>
    </div>
  );
}
