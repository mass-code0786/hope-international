'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Boxes, ShoppingCart, Wallet, Cpu, Gift, Network, Settings, Image } from 'lucide-react';
import { THEME } from '@/lib/constants/theme';
import { Logo } from '@/components/common/Logo';

const adminNav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Boxes },
  { href: '/admin/banners', label: 'Banners', icon: Image },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/wallet', label: 'Wallet Ops', icon: Wallet },
  { href: '/admin/compensation', label: 'Compensation', icon: Cpu },
  { href: '/admin/rewards', label: 'Rewards', icon: Gift },
  { href: '/admin/team', label: 'Genealogy', icon: Network },
  { href: '/admin/settings', label: 'Settings', icon: Settings }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-80 border-r border-white/10 bg-card p-6 lg:block">
      <div className="mb-8 flex flex-col items-center">
        <div className="rounded-2xl border border-white/20 bg-white p-2">
          <Logo size={40} variant="full" />
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted">Admin Console</p>
        <h1 className="text-center text-lg font-semibold text-accent">{THEME.appName}</h1>
        <p className="text-sm text-muted">Operational Control Center</p>
      </div>
      <nav className="space-y-2">
        {adminNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${active ? 'bg-accent/20 text-accentSoft' : 'text-muted hover:bg-white/5 hover:text-text'}`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
