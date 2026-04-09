'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import Logo from '@/components/common/Logo';

export function Header({ rightSlot = null, className = '', title = 'Hope International', subtitle = '', children = null }) {
  return (
    <header className={`sticky top-0 z-20 rounded-[26px] border border-[var(--hope-border)] bg-white/88 p-3 shadow-[0_20px_44px_rgba(15,23,42,0.06)] backdrop-blur dark:bg-slate-950/78 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <Link href="/dashboard" aria-label="Go to dashboard" className="min-w-0 shrink">
          <div className="flex items-center gap-3">
            <Logo size={42} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[-0.03em] text-text">{title}</p>
              {subtitle ? <p className="mt-0.5 line-clamp-1 text-xs text-muted">{subtitle}</p> : null}
            </div>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          {rightSlot || (
            <Link href="/profile" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[var(--hope-border)] bg-cardSoft text-slate-700 dark:text-slate-200" aria-label="Open profile">
              <User size={14} />
            </Link>
          )}
        </div>
      </div>
      {children}
    </header>
  );
}
