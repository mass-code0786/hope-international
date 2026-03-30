'use client';

import Link from 'next/link';
import Logo from '@/components/common/Logo';

export function Topbar() {
  return (
    <header className="hope-panel mb-4 flex items-center justify-between rounded-[24px] border-b border-[var(--hope-border)] px-4 py-3 sm:px-5 sm:py-4">
      <Link href="/dashboard" aria-label="Go to dashboard" className="inline-flex items-center rounded-[20px] bg-white/90 p-2.5 shadow-sm dark:bg-slate-950/85">
        <Logo size={48} />
      </Link>

      <Link
        href="/profile"
        aria-label="Open profile"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--hope-border)] bg-cardSoft text-sm font-semibold text-text transition hover:bg-card"
      >
        P
      </Link>
    </header>
  );
}
