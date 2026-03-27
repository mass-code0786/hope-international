'use client';

import { Bell, Search } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function AdminTopbar({ user }) {
  return (
    <header className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/[0.16] bg-cardSoft/[0.95] p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="mb-2">
          <Logo size={42} className="border-white/10 bg-neutral-900/80" imageClassName="p-1.5" />
        </div>
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Administrator</p>
        <div className="flex items-center gap-2 overflow-hidden">
          <h2 className="truncate text-lg font-semibold text-text">{user?.username || 'Admin User'}</h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-muted md:flex">
          <Search size={14} />
          <span>Search records...</span>
        </div>
        <ThemeToggle />
        <button className="rounded-xl bg-white/5 p-2 text-muted hover:text-text">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
