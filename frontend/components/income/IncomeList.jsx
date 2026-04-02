import { Badge } from '@/components/ui/Badge';
import { currency, dateTime, incomeSourceLabel, txTypeLabel } from '@/lib/utils/format';

function sourceVariant(source) {
  if (source === 'direct_income' || source === 'direct_deposit_income' || source === 'level_deposit_income' || source === 'matching_income' || source === 'reward_qualification') return 'success';
  if (source === 'cap_overflow') return 'warning';
  return 'default';
}

function statusBadge(tx) {
  if (tx?.is_reversal) return { label: 'Reversed', variant: 'danger' };
  if (tx?.tx_type === 'credit') return { label: 'Credited', variant: 'success' };
  if (tx?.tx_type === 'debit') return { label: 'Debit', variant: 'warning' };
  return { label: 'Pending', variant: 'default' };
}

export function IncomeList({ transactions = [] }) {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  return (
    <div className="card-surface overflow-hidden p-0">
      <div className="border-b border-[var(--hope-border)] px-4 py-3">
        <p className="text-sm font-semibold text-text">Income History</p>
      </div>
      <div className="divide-y divide-[var(--hope-border)]">
        {safeTransactions.map((tx, idx) => {
          const positive = tx?.tx_type === 'credit';
          const id = tx?.id || `${tx?.created_at || 'tx'}-${idx}`;
          const metadata = tx?.metadata || {};
          const status = statusBadge(tx);
          return (
            <div key={id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.4fr),auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-text">{incomeSourceLabel(tx?.source)}</p>
                  <Badge variant={sourceVariant(tx?.source)}>{txTypeLabel(tx?.tx_type)}</Badge>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">{metadata.rewardLabel || metadata.note || metadata.reason || metadata.cycleLabel || '-'}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                  <span>{dateTime(tx?.created_at)}</span>
                  {tx?.reference_id ? <span className="font-mono">Ref {String(tx.reference_id).slice(0, 8)}</span> : null}
                </div>
              </div>
              <div className="text-left lg:text-right">
                <p className={`text-lg font-semibold tracking-[-0.04em] ${positive ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'}`}>{positive ? '+' : '-'} {currency(tx?.amount)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
