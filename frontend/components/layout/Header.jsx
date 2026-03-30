'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import Logo from '@/components/common/Logo';

export function Header({ rightSlot = null, className = '' }) {
  return (
    <header className={`sticky top-0 z-20 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.05)] ${className}`.trim()}>
      <div className="flex items-center justify-between gap-2">
        <Link href="/dashboard" aria-label="Go to dashboard" className="shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900">
            <Logo size={36} />
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          {rightSlot || (
            <Link href="/profile" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700" aria-label="Open profile">
              <User size={14} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
