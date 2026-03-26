'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Network, Wallet, User, Store } from 'lucide-react';
import { isSeller } from '@/lib/constants/access';

const iconMap = {
  home: Home,
  'shopping-bag': ShoppingBag,
  network: Network,
  wallet: Wallet,
  user: User,
  store: Store
};

function getNavItems(user, sellerActive) {
  const items = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/shop', label: 'Shop', icon: 'shopping-bag' },
    { href: '/team', label: 'Team', icon: 'network' },
    { href: '/income', label: 'Income', icon: 'wallet' }
  ];

  items.push({
    href: (isSeller(user) || sellerActive) ? '/seller' : '/seller/apply',
    label: (isSeller(user) || sellerActive) ? 'Seller' : 'Apply',
    icon: 'store'
  });

  items.push({ href: '/profile', label: 'Profile', icon: 'user' });
  return items;
}

export function BottomNav({ user, sellerActive = false }) {
  const pathname = usePathname();
  const items = getNavItems(user, sellerActive);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-card/95 backdrop-blur md:hidden">
      <div className={`mx-auto grid max-w-2xl ${items.length === 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-1 py-3 text-xs">
              <Icon size={18} className={active ? 'text-accent' : 'text-muted'} />
              <span className={active ? 'text-accent' : 'text-muted'}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
