import { CircleDollarSign, Gift, GitCompareArrows, ShieldAlert } from 'lucide-react';
import { currency, number } from '@/lib/utils/format';

export function IncomeSummaryStrip({ direct = 0, matching = 0, reward = 0, overflow = 0 }) {
  const total = Number(direct || 0) + Number(matching || 0) + Number(reward || 0);
  const cards = [
    { label: 'Total Earnings', value: currency(total), icon: CircleDollarSign, tone: 'primary' },
    { label: 'Direct Income', value: currency(direct), icon: CircleDollarSign },
    { label: 'Matching Income', value: currency(matching), icon: GitCompareArrows },
    { label: 'Reward Income', value: currency(reward), icon: Gift },
    { label: 'Overflow', value: overflow ? number(overflow) : 'None', icon: ShieldAlert }
  ];

  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`min-w-[220px] snap-start rounded-[24px] border p-4 ${card.tone === 'primary' ? 'border-slate-900 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-[var(--hope-border)] bg-cardSoft text-text'}`}>
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.tone === 'primary' ? 'bg-white/10 text-white dark:bg-slate-900 dark:text-white' : 'bg-[var(--hope-accent-soft)] text-accent'}`}>
              <Icon size={16} />
            </div>
            <p className={`mt-4 text-[11px] uppercase tracking-[0.18em] ${card.tone === 'primary' ? 'text-white/70 dark:text-slate-500' : 'text-muted'}`}>{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
