'use client';

import { ChevronRight } from 'lucide-react';
import { currency } from '@/lib/utils/format';

const cardToneByType = {
  total: 'border-[rgba(45,212,191,0.22)] bg-[linear-gradient(155deg,rgba(19,31,42,0.94),rgba(18,22,34,0.98))] shadow-[0_18px_38px_rgba(6,11,22,0.42)]',
  pool_2: 'border-[rgba(45,212,191,0.16)] bg-[linear-gradient(155deg,rgba(14,31,38,0.94),rgba(15,20,31,0.98))] shadow-[0_18px_38px_rgba(5,12,18,0.42)]',
  pool_99: 'border-[rgba(59,130,246,0.18)] bg-[linear-gradient(155deg,rgba(16,28,46,0.94),rgba(15,18,31,0.98))] shadow-[0_18px_38px_rgba(7,12,24,0.42)]',
  pool_313: 'border-[rgba(129,140,248,0.18)] bg-[linear-gradient(155deg,rgba(22,24,46,0.94),rgba(16,18,30,0.98))] shadow-[0_18px_38px_rgba(10,10,26,0.42)]',
  pool_786: 'border-[rgba(168,85,247,0.18)] bg-[linear-gradient(155deg,rgba(28,21,45,0.94),rgba(16,18,30,0.98))] shadow-[0_18px_38px_rgba(16,9,28,0.42)]',
  sponsor_pool: 'border-[rgba(250,204,21,0.18)] bg-[linear-gradient(155deg,rgba(39,28,18,0.94),rgba(17,19,29,0.98))] shadow-[0_18px_38px_rgba(20,13,8,0.42)]'
};

export function IncomeCard({ title, amount, type, onClick, loading = false }) {
  const tone = cardToneByType[type] || cardToneByType.total;

  return (
    <button
      type="button"
      onClick={() => onClick?.(type)}
      className={`group relative min-h-[108px] overflow-hidden rounded-[24px] border px-4 py-3.5 text-left backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-white/16 ${tone}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.08),transparent_30%)]" />
      <div className="absolute -right-4 top-0 h-16 w-16 rounded-full bg-white/6 blur-2xl transition duration-200 group-hover:bg-white/10" />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 text-[12px] font-medium leading-5 text-slate-300">{title}</p>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.05] text-slate-200 transition duration-200 group-hover:border-white/14 group-hover:text-white">
            <ChevronRight size={16} />
          </span>
        </div>

        {loading ? (
          <span className="mt-4 block h-8 w-24 animate-pulse rounded-full bg-white/10" />
        ) : (
          <p className="mt-4 text-[22px] font-semibold tracking-[-0.04em] text-white">{currency(amount)}</p>
        )}
      </div>
    </button>
  );
}
