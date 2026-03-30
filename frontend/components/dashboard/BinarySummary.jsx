import { ArrowLeftRight, GitMerge, Network, ShieldCheck } from 'lucide-react';
import { number, rankLabel } from '@/lib/utils/format';

export function BinarySummary({ me, directChildren = [], teamSummary = {} }) {
  const leftPv = Number(me?.carry_left_pv || 0);
  const rightPv = Number(me?.carry_right_pv || 0);
  const matchedPotential = Math.min(leftPv, rightPv);
  const activeDirects = directChildren.filter((child) => child?.is_active !== false).length;
  const totalDirects = directChildren.length;

  return (
    <section className="card-surface p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="hope-kicker mb-3"><GitMerge size={12} /> Binary summary</span>
          <h2 className="text-2xl font-semibold tracking-[-0.05em] text-text">Network balance and carry view</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">This snapshot uses your live left and right carry values plus direct referral counts from the current backend profile and team endpoints.</p>
        </div>
        <div className="rounded-[24px] border border-[var(--hope-border)] bg-cardSoft px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Current rank</p>
          <p className="mt-2 text-xl font-semibold text-text">{rankLabel(me?.rank_name)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric icon={ArrowLeftRight} label="Carry Left PV" value={number(leftPv)} />
        <Metric icon={ArrowLeftRight} label="Carry Right PV" value={number(rightPv)} />
        <Metric icon={GitMerge} label="Matched Potential" value={number(matchedPotential)} />
        <Metric icon={ShieldCheck} label="Active Directs" value={number(activeDirects)} />
        <Metric icon={Network} label="Total Directs" value={number(totalDirects)} />
        <Metric icon={Network} label="Total Team" value={number(teamSummary?.total_descendants || 0)} />
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="hope-grid-card rounded-[24px] p-4">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent">
        <Icon size={16} />
      </div>
      <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-text">{value}</p>
    </div>
  );
}
