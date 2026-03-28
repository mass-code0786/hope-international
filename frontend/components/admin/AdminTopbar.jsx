'use client';

import { Bell, LogOut, Menu, Search } from 'lucide-react';
import Logo from '@/components/common/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function AdminTopbar({ user, onLogout, onOpenMenu }) {
  return (
    <header className="relative z-[60] mb-5 flex flex-col gap-3 rounded-2xl border border-white/[0.16] bg-cardSoft/[0.98] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <button
              onClick={onOpenMenu}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-text shadow-[0_8px_20px_rgba(0,0,0,0.2)] lg:hidden"
              aria-label="Open admin menu"
            >
              <Menu size={20} />
            </button>
            <div className="inline-flex rounded-lg bg-neutral-900 p-2">
              <Logo size={42} />
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Administrator</p>
          <div className="flex items-center gap-2 overflow-hidden">
            <h2 className="truncate text-lg font-semibold text-text">{user?.username || 'Admin User'}</h2>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
