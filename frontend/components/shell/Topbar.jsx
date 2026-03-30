'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellDot, ShoppingCart, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import Logo from '@/components/common/Logo';
import { subscribeCart } from '@/lib/utils/cart';
import { initTheme } from '@/lib/utils/theme';

export function Topbar({ user }) {
  const [cartCount, setCartCount] = useState(0);
  const [theme, setTheme] = useState('dark');

  useEffect(() => subscribeCart(setCartCount), []);

  useEffect(() => {
    setTheme(initTheme());

    const onThemeChange = (event) => {
      if (event?.detail === 'light' || event?.detail === 'dark') {
        setTheme(event.detail);
      }
    };

    window.addEventListener('hope-theme-change', onThemeChange);
    return () => window.removeEventListener('hope-theme-change', onThemeChange);
  }, []);

  const isLight = theme === 'light';

  return (
    <header className="hope-panel mb-4 flex flex-col gap-3 rounded-[28px] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/dashboard" aria-label="Go to dashboard home" className="shrink-0">
          <div className={isLight ? 'rounded-[20px] bg-white p-2.5 shadow-sm' : 'rounded-[20px] bg-slate-950 p-2.5 shadow-sm'}>
            <Logo size={42} />
          </div>
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="hope-kicker !px-2.5 !py-1"><Sparkles size={12} /> Member space</span>
            <span className="text-[11px] font-medium text-muted">Premium marketplace and referral workspace</span>
          </div>
          <p className="mt-2 truncate text-base font-semibold tracking-[-0.03em] text-text">{user?.first_name || user?.username || 'Hope Partner'}</p>
          <p className="truncate text-xs text-muted">@{user?.username || 'member'}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--hope-border)] bg-cardSoft text-muted transition hover:text-text">
          <BellDot size={16} />
        </button>
        <Link href="/cart" className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--hope-border)] bg-cardSoft text-text">
          <ShoppingCart size={16} />
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        </Link>
        <ThemeToggle className="!rounded-2xl !border-[var(--hope-border)] !bg-cardSoft !p-2.5 !text-muted" />
        <Link href="/profile" className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-2xl border border-[var(--hope-border)] bg-[var(--hope-accent-soft)] px-3 text-xs font-semibold text-accent">
          {user?.username?.[0]?.toUpperCase() || 'H'}
        </Link>
      </div>
    </header>
  );
}
