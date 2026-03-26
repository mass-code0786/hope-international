'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ShoppingCart } from 'lucide-react';
import { LogoMark } from '@/components/brand/HopeLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { subscribeCart } from '@/lib/utils/cart';

export function Topbar({ user }) {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    return subscribeCart(setCartCount);
  }, []);

  return (
    <header className="mb-5 space-y-3 rounded-2xl border border-white/[0.2] bg-gradient-to-br from-cardSoft/[0.98] via-cardSoft/[0.96] to-card/[0.95] p-4 md:space-y-0 md:flex md:items-center md:justify-between md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2.5">
            <span className="inline-flex shrink-0 items-center justify-center rounded-xl border border-accent/[0.5] bg-gradient-to-br from-black/65 to-[#0b1324] p-1.5 shadow-[0_0_0_1px_rgba(212,175,55,0.12)]">
              <LogoMark size={32} />
            </span>
            <span className="hidden min-[390px]:inline text-[11px] font-semibold uppercase tracking-[0.14em] text-accentSoft/95">
              Hope International
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 overflow-hidden">
            <h2 className="truncate text-sm font-semibold text-text md:text-lg">{user?.username || 'Partner'}</h2>
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.18] bg-accent/20 text-sm font-semibold text-accentSoft">
          {user?.username?.[0]?.toUpperCase() || 'H'}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 md:w-auto md:justify-end md:gap-3">
        <p className="text-xs text-muted md:hidden">Welcome back</p>
        <Link href="/shop" className="relative inline-flex min-h-10 min-w-[108px] items-center justify-center gap-1.5 rounded-xl border border-accent/[0.45] bg-gradient-to-r from-accent/[0.22] to-accent/[0.1] px-3 py-2 text-xs font-semibold text-accentSoft shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <ShoppingCart size={16} />
          <span>Cart</span>
          <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-black">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        </Link>
        <ThemeToggle />
        <button className="hidden rounded-xl bg-white/[0.08] p-2 text-muted hover:text-text md:inline-flex">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
