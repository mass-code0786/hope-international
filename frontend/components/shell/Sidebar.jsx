'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowDownToLine, ArrowUpFromLine, CircleDollarSign, ClipboardList, Gavel, Headset, Home, Layers3, Network, ShoppingBag, Sparkles, Store, User, Wallet } from 'lucide-react';
import { THEME } from '@/lib/constants/theme';
import { isSeller } from '@/lib/constants/access';
import Logo from '@/components/common/Logo';

function getGroups(user, sellerActive) {
  return [
    {
      title: 'Workspace',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: Home },
        { href: '/wallet', label: 'Wallet', icon: Wallet },
        { href: '/auctions', label: 'Auctions', icon: Gavel },
        { href: '/shop', label: 'Shop', icon: ShoppingBag },
        { href: '/team', label: 'Team', icon: Network },
        { href: '/autopool', label: 'Autopool', icon: Layers3 },
        { href: '/income', label: 'Income', icon: CircleDollarSign },
        { href: '/orders', label: 'Orders', icon: ClipboardList },
        { href: '/support', label: 'Support', icon: Headset }
      ]
    },
    {
      title: 'Finance',
      items: [
        { href: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
        { href: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine }
      ]
    },
    {
      title: 'Account',
      items: [
        {
          href: (isSeller(user) || sellerActive) ? '/seller' : '/seller/apply',
          label: (isSeller(user) || sellerActive) ? 'Seller Hub' : 'Become Seller',
          icon: Store
        },
        { href: '/profile', label: 'Profile', icon: User }
      ]
    }
  ];
}

function SidebarSection({ title, items, pathname }) {
  return (
    <div>
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">{title}</p>
      <div className="space-y-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${active ? 'bg-[linear-gradient(135deg,#8b3dff,#32d17d)] text-white shadow-[0_16px_30px_rgba(90,47,180,0.34)]' : 'text-white/68 hover:bg-white/8 hover:text-white'}`}
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-white/16 text-white' : 'bg-white/8 text-white/80'}`}>
                <Icon size={16} />
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({ user, sellerActive = false }) {
  const pathname = usePathname();
  const groups = getGroups(user, sellerActive);

  return (
    <aside className="hidden w-80 border-r border-[var(--hope-border)] bg-[linear-gradient(180deg,#1e1f25,#23242b)] p-6 text-white md:block">
      <div className="mb-6 rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.28)] backdrop-blur">
        <div className="flex items-center gap-3">
          <Logo size={60} className="shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">Hope International</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em]">Member Console</h2>
          </div>
        </div>
        <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,rgba(139,61,255,0.24),rgba(50,209,125,0.18))] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
            <Sparkles size={12} />
            Live business tools
          </div>
          <p className="mt-3 text-sm font-semibold text-white">{user?.first_name || user?.username || 'Hope Member'}</p>
          <p className="mt-1 text-xs text-white/60">{THEME.tagline}</p>
        </div>
      </div>
      <div className="space-y-5">
        {groups.map((group) => (
          <SidebarSection key={group.title} title={group.title} items={group.items} pathname={pathname} />
        ))}
      </div>
    </aside>
  );
}
