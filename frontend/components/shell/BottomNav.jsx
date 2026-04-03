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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--hope-border)] bg-[rgba(32,33,39,0.95)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-6 px-1 pb-[max(env(safe-area-inset-bottom),0.2rem)] pt-1">
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={`${item.href}-${item.label}`} href={item.href} className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[9px]">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${active ? 'bg-[linear-gradient(135deg,#8b3dff,#32d17d)] text-white shadow-[0_12px_22px_rgba(90,47,180,0.34)]' : 'bg-transparent text-[var(--hope-muted)]'}`}>
                <Icon size={15} />
              </span>
              <span className={active ? 'font-semibold text-text' : 'text-muted'}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
