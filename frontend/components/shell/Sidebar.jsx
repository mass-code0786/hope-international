'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Network, Wallet, User, ClipboardList, Store } from 'lucide-react';
import { THEME } from '@/lib/constants/theme';
import { isSeller } from '@/lib/constants/access';
import { LogoFull } from '@/components/brand/HopeLogo';

function getItems(user, sellerActive) {
  const nav = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/shop', label: 'Shop', icon: ShoppingBag },
    { href: '/team', label: 'Team', icon: Network },
    { href: '/income', label: 'Income', icon: Wallet },
    { href: '/orders', label: 'Orders', icon: ClipboardList }
  ];

  nav.push({
    href: (isSeller(user) || sellerActive) ? '/seller' : '/seller/apply',
    label: (isSeller(user) || sellerActive) ? 'Seller Hub' : 'Become Seller',
    icon: Store
  });

  nav.push({ href: '/profile', label: 'Profile', icon: User });
  return nav;
}

export function Sidebar({ user, sellerActive = false }) {
  const pathname = usePathname();
  const items = getItems(user, sellerActive);

  return (
    <aside className="hidden w-72 border-r border-white/10 bg-[#111111] p-6 md:block">
      <div className="mb-8 flex flex-col items-center">
        <div className="rounded-2xl border border-accent/[0.28] bg-black/35 p-2">
          <LogoFull size={124} />
        </div>
        <p className="mt-2 text-center text-xs text-muted">{THEME.tagline}</p>
      </div>
      <nav className="space-y-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${active ? 'bg-accent/20 text-accentSoft' : 'text-muted hover:bg-white/5 hover:text-text'}`}
            >
              <Icon size={16} /> {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
