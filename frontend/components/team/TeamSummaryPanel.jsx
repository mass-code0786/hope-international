import { ArrowLeftRight, Network, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { number } from '@/lib/utils/format';

export function TeamSummaryPanel({ me, teamSummary = {}, children = [], hasNestedTreeData = false }) {
  const leftPv = Number(me?.carry_left_pv || 0);
  const rightPv = Number(me?.carry_right_pv || 0);
  const matchedPotential = Math.min(leftPv, rightPv);
  const totalDirects = children.length;
  const activeDirects = children.filter((child) => child?.is_active !== false).length;
  const totalTeam = Number(teamSummary?.total_descendants || totalDirects || 0);
  const activeTeam = Number(teamSummary?.active_count || activeDirects || 0);
  const sponsor = [me?.sponsor_first_name, me?.sponsor_last_name].filter(Boolean).join(' ').trim() || me?.sponsor_username || 'No sponsor assigned';
  const placement = me?.placement_side ? `${String(me.placement_side).charAt(0).toUpperCase()}${String(me.placement_side).slice(1)} leg` : 'Pending placement';
  const balance = leftPv + rightPv > 0 ? Math.min(100, Math.round((leftPv / Math.max(leftPv + rightPv, 1)) * 100)) : 50;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card label="Total Team" value={number(totalTeam)} icon={UsersRound} />
        <Card label="Active Team" value={number(activeTeam)} icon={UsersRound} />
        <Card label="Direct Referrals" value={number(totalDirects)} icon={Network} />
        <Card label="Sponsor" value={sponsor} />
        <Card label="Left PV" value={number(leftPv)} icon={ArrowLeftRight} />
        <Card label="Right PV" value={number(rightPv)} icon={ArrowLeftRight} />
        <Card label="Placement Side" value={placement} />
        <Card label="Matched Potential" value={number(matchedPotential)} icon={Network} />
      </div>

      <div className="card-surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={hasNestedTreeData ? 'success' : 'warning'}>{hasNestedTreeData ? 'Nested tree detected' : 'Showing direct team only'}</Badge>
              <Badge variant="accent">Binary view</Badge>
            </div>
            <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-text">Left/right binary balance</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">A simplified visual block for current carry volume and matched potential using the real profile values from the backend.</p>
          </div>
          <div className="rounded-[24px] border border-[var(--hope-border)] bg-cardSoft px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Matched potential preview</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text">{number(matchedPotential)}</p>
          </div>
        </div>
        <div className="mt-5 rounded-[28px] border border-[var(--hope-border)] bg-cardSoft p-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            <span>Left volume</span>
            <span>Right volume</span>
          </div>
          <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/60 dark:bg-white/5">
            <div className="flex h-full">
              <div className="bg-[linear-gradient(90deg,var(--hope-accent),#14b8a6)]" style={{ width: `${balance}%` }} />
              <div className="bg-[linear-gradient(90deg,#f59e0b,#f97316)]" style={{ width: `${100 - balance}%` }} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-[22px] bg-card px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Left</p>
              <p className="mt-2 text-xl font-semibold text-text">{number(leftPv)}</p>
            </div>
            <div className="rounded-[22px] bg-card px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Right</p>
              <p className="mt-2 text-xl font-semibold text-text">{number(rightPv)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Card({ label, value, icon: Icon }) {
  return (
    <div className="hope-grid-card rounded-[24px] p-4">
      {Icon ? <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent"><Icon size={16} /></div> : null}
      <p className={`text-[11px] uppercase tracking-[0.18em] text-muted ${Icon ? 'mt-4' : ''}`}>{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-text break-words">{value}</p>
    </div>
  );
}
