'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Gavel, ShoppingBag, Network, Wallet, User, ClipboardList, Store, Sparkles } from 'lucide-react';
import { THEME } from '@/lib/constants/theme';
import { isSeller } from '@/lib/constants/access';
import Logo from '@/components/common/Logo';

function getItems(user, sellerActive) {
  const nav = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/auctions', label: 'Auctions', icon: Gavel },
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
    <aside className="hidden w-80 border-r border-white/10 bg-[linear-gradient(180deg,rgba(6,16,27,0.98),rgba(11,23,36,0.96))] p-6 text-white md:block">
      <div className="mb-8 rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_64px_rgba(2,8,23,0.28)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="rounded-[22px] bg-white/95 p-2.5 shadow-sm">
            <Logo size={52} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">Hope International</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em]">Member Console</h2>
          </div>
        </div>
        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200">
            <Sparkles size={12} />
            Premium access
          </div>
          <p className="mt-3 text-sm font-semibold text-white">{user?.first_name || user?.username || 'Hope Member'}</p>
          <p className="mt-1 text-xs text-white/60">{THEME.tagline}</p>
        </div>
      </div>
      <nav className="space-y-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${active ? 'bg-white text-slate-900 shadow-[0_18px_36px_rgba(255,255,255,0.12)]' : 'text-white/68 hover:bg-white/8 hover:text-white'}`}
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-slate-900 text-white' : 'bg-white/8 text-white/80'}`}>
                <Icon size={16} />
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
