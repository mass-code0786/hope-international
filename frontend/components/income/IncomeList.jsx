import { Badge } from '@/components/ui/Badge';
import { currency, dateTime, incomeSourceLabel, txTypeLabel } from '@/lib/utils/format';

function sourceVariant(source) {
  if (source === 'direct_income' || source === 'matching_income' || source === 'reward_qualification') return 'success';
  if (source === 'cap_overflow') return 'danger';
  return 'default';
}

export function IncomeList({ transactions = [] }) {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  return (
    <div className="card-surface overflow-hidden">
      <div className="border-b border-white/10 p-4 text-sm text-muted">Transaction History</div>
      <div className="divide-y divide-white/5">
        {safeTransactions.map((tx, idx) => {
          const positive = tx?.tx_type === 'credit';
          const id = tx?.id || `${tx?.created_at || 'tx'}-${idx}`;
          const metadata = tx?.metadata || {};
          return (
            <div key={id} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[1.6fr,1fr,1fr,1.4fr] md:items-center">
              <div>
                <p className="text-sm font-medium text-text">{incomeSourceLabel(tx?.source)}</p>
                <p className="text-xs text-muted">{dateTime(tx?.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant={positive ? 'success' : 'danger'}>{txTypeLabel(tx?.tx_type)}</Badge>
                <Badge variant={sourceVariant(tx?.source)}>{incomeSourceLabel(tx?.source)}</Badge>
              </div>
              <div className={`text-sm font-semibold ${positive ? 'text-success' : 'text-danger'}`}>
                {positive ? '+' : '-'} {currency(tx?.amount)}
              </div>
              <div className="text-xs text-muted">{metadata.rewardLabel || metadata.note || metadata.reason || '-'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
