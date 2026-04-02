'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gavel, LayoutGrid, Network, ShoppingBag, User, Wallet } from 'lucide-react';

const iconMap = {
  dashboard: LayoutGrid,
  auctions: Gavel,
  'shopping-bag': ShoppingBag,
  network: Network,
  wallet: Wallet,
  user: User
};

function getNavItems() {
  return [
    { href: '/dashboard', label: 'Home', icon: 'dashboard' },
    { href: '/wallet', label: 'Wallet', icon: 'wallet' },
    { href: '/auctions', label: 'Auctions', icon: 'auctions' },
    { href: '/shop', label: 'Shop', icon: 'shopping-bag' },
    { href: '/team', label: 'Team', icon: 'network' },
    { href: '/profile', label: 'Profile', icon: 'user' }
  ];
}

export function BottomNav() {
  const pathname = usePathname();
  const items = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--hope-border)] bg-white/94 backdrop-blur md:hidden dark:bg-slate-950/92">
      <div className="mx-auto grid max-w-2xl grid-cols-6">
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={`${item.href}-${item.label}`} href={item.href} className="flex flex-col items-center justify-center gap-1 py-2.5 text-[9px]">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl ${active ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-500 dark:text-slate-400'}`}>
                <Icon size={15} />
              </span>
              <span className={active ? 'font-semibold text-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-400'}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
