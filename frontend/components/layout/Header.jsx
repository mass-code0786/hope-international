'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import Logo from '@/components/common/Logo';

export function Header({ rightSlot = null, className = '', children = null }) {
  return (
    <header className={`sticky top-0 z-20 rounded-[28px] border border-[var(--hope-border)] bg-white/88 px-4 py-2.5 shadow-[0_20px_44px_rgba(15,23,42,0.06)] backdrop-blur dark:bg-slate-950/78 ${className}`.trim()}>
      <div className="flex min-h-[60px] items-center justify-between gap-3">
        <Link href="/dashboard" aria-label="Go to dashboard" className="shrink-0">
          <Logo size={58} className="ml-0.5 block shrink-0" />
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          {rightSlot || (
            <Link href="/profile" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--hope-border)] bg-cardSoft text-slate-700 dark:text-slate-200" aria-label="Open profile">
              <User size={15} />
            </Link>
          )}
        </div>
      </div>
      {children}
    </header>
  );
}
