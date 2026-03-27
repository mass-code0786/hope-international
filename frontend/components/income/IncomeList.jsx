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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 text-[11px] text-slate-500">Transaction History</div>
      <div className="divide-y divide-slate-100">
        {safeTransactions.map((tx, idx) => {
          const positive = tx?.tx_type === 'credit';
          const id = tx?.id || `${tx?.created_at || 'tx'}-${idx}`;
          const metadata = tx?.metadata || {};
          return (
            <div key={id} className="grid grid-cols-1 gap-2 px-3 py-2.5 md:grid-cols-[1.4fr,1fr,0.8fr,1.3fr] md:items-center">
              <div>
                <p className="text-xs font-medium text-slate-800">{incomeSourceLabel(tx?.source)}</p>
                <p className="text-[10px] text-slate-500">{dateTime(tx?.created_at)}</p>
              </div>
              <div className="flex gap-1.5">
                <Badge variant={positive ? 'success' : 'danger'}>{txTypeLabel(tx?.tx_type)}</Badge>
                <Badge variant={sourceVariant(tx?.source)}>{incomeSourceLabel(tx?.source)}</Badge>
              </div>
              <div className={`text-xs font-semibold ${positive ? 'text-success' : 'text-danger'}`}>
                {positive ? '+' : '-'} {currency(tx?.amount)}
              </div>
              <div className="text-[10px] text-slate-500">{metadata.rewardLabel || metadata.note || metadata.reason || '-'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
