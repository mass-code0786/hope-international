import { Badge } from '@/components/ui/Badge';
import { currency, incomeSourceLabel, number } from '@/lib/utils/format';

export function IncomeHighlights({ direct = 0, matching = 0, rewards = 0, overflow = 0 }) {
  const total = Number(direct || 0) + Number(matching || 0) + Number(rewards || 0);

  return (
    <section className="card-surface p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="hope-kicker mb-3">Income summary</span>
          <h2 className="text-2xl font-semibold tracking-[-0.05em] text-text">Earnings at a glance</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Direct, matching, and reward credits pulled from your wallet ledger.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Total earnings {currency(total)}</Badge>
          {overflow ? <Badge variant="warning">Overflow logged {number(overflow)}</Badge> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={incomeSourceLabel('direct_income')} value={currency(direct)} />
        <Tile label={incomeSourceLabel('matching_income')} value={currency(matching)} />
        <Tile label={incomeSourceLabel('reward_qualification')} value={currency(rewards)} />
        <Tile label="Total earnings" value={currency(total)} strong />
      </div>
    </section>
  );
}

function Tile({ label, value, strong = false }) {
  return (
    <div className={`rounded-[24px] border border-[var(--hope-border)] p-4 ${strong ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-900' : 'bg-cardSoft'}`}>
      <p className={`text-[11px] uppercase tracking-[0.18em] ${strong ? 'text-white/70 dark:text-slate-500' : 'text-muted'}`}>{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.05em]">{value}</p>
    </div>
  );
}
