'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { LogoMark } from '@/components/brand/HopeLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { subscribeCart } from '@/lib/utils/cart';

export function Topbar({ user }) {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => subscribeCart(setCartCount), []);

  return (
    <header className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
          <LogoMark size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-800">Hope International</p>
          <p className="truncate text-[10px] text-slate-500">{user?.username || 'Partner'}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Link href="/shop" className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
          <ShoppingCart size={14} />
          <span className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-semibold text-white">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        </Link>
        <ThemeToggle className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600" />
        <Link href="/profile" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
          {user?.username?.[0]?.toUpperCase() || 'H'}
        </Link>
      </div>
    </header>
  );
}
