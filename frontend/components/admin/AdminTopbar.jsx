'use client';

import { Bell, Search } from 'lucide-react';
import { LogoMark } from '@/components/brand/HopeLogo';
import { DemoModeBadge } from '@/components/ui/DemoModeBadge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { isDemoUser } from '@/lib/utils/demoMode';

export function AdminTopbar({ user }) {
  const demo = isDemoUser(user);

  return (
    <header className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/[0.16] bg-cardSoft/[0.95] p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="mb-1 inline-flex items-center gap-2.5">
          <span className="inline-flex shrink-0 items-center justify-center rounded-xl border border-accent/[0.5] bg-gradient-to-br from-black/65 to-[#0b1324] p-1.5 shadow-[0_0_0_1px_rgba(212,175,55,0.12)]">
            <LogoMark size={32} />
          </span>
          <span className="hidden min-[390px]:inline text-[11px] font-semibold uppercase tracking-[0.14em] text-accentSoft/95">
            Hope International
          </span>
        </div>
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Administrator</p>
        <div className="flex items-center gap-2 overflow-hidden">
          <h2 className="truncate text-lg font-semibold text-text">{user?.username || 'Admin User'}</h2>
          {demo ? <DemoModeBadge /> : null}
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
