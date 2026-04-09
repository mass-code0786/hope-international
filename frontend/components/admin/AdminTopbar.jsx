'use client';

import { Bell, LogOut, Menu, Search, ShieldCheck } from 'lucide-react';
import Logo from '@/components/common/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function AdminTopbar({ user, onLogout, onOpenMenu }) {
  return (
    <header className="hope-panel relative z-[60] mb-4 flex flex-col gap-3 rounded-[28px] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-3">
            <button
              onClick={onOpenMenu}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--hope-border)] bg-cardSoft text-text shadow-[0_8px_20px_rgba(0,0,0,0.14)] lg:hidden"
              aria-label="Open admin menu"
            >
              <Menu size={20} />
            </button>
            <Logo size={48} className="shrink-0" />
            <span className="hope-kicker hidden sm:inline-flex"><ShieldCheck size={12} /> Operations</span>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Administrator</p>
          <div className="flex items-center gap-2 overflow-hidden">
            <h2 className="truncate text-xl font-semibold tracking-[-0.04em] text-text">{user?.username || 'Admin User'}</h2>
          </div>
          <p className="mt-1 text-xs text-muted">Products, deposits, withdrawals, auctions, support, landing content, and settings.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden items-center gap-2 rounded-2xl border border-[var(--hope-border)] bg-cardSoft px-3 py-2 text-sm text-muted md:flex">
          <Search size={14} />
          <span>Operations console</span>
        </div>
        <ThemeToggle className="!rounded-2xl !border-[var(--hope-border)] !bg-cardSoft !p-2.5 !text-muted" />
        <button className="rounded-2xl border border-[var(--hope-border)] bg-cardSoft p-2.5 text-muted hover:text-text">
          <Bell size={18} />
        </button>
        <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/15">
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
