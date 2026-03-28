'use client';

import { Bell, LogOut, Search } from 'lucide-react';
import Logo from '@/components/common/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function AdminTopbar({ user, onLogout }) {
  return (
    <header className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/[0.16] bg-cardSoft/[0.95] p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="mb-2">
          <div className="inline-flex rounded-lg bg-neutral-900 p-2">
            <Logo size={42} />
          </div>
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
        <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/15">
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
