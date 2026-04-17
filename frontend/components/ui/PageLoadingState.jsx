'use client';

import { SectionHeader } from '@/components/ui/SectionHeader';

export function PageLoadingState({ title = 'Loading', subtitle = '', blocks = 2 }) {
  return (
    <div className="space-y-4">
      <SectionHeader title={title} subtitle={subtitle} />
      {Array.from({ length: blocks }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-[var(--hope-border)] bg-card p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
        >
          <div className="space-y-3">
            <div className="h-4 w-36 rounded-full bg-white/10" />
            <div className="h-3 w-5/6 rounded-full bg-white/5" />
            <div className="h-3 w-2/3 rounded-full bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
