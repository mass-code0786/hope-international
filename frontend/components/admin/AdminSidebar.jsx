'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LayoutDashboard, Users, Boxes, ShoppingCart, Wallet, Cpu, Gift, Network, Settings, Image, ArrowDownCircle, ArrowUpCircle, Repeat2, Landmark, BadgeDollarSign, Gavel, Sparkles } from 'lucide-react';
import { THEME } from '@/lib/constants/theme';
import Logo from '@/components/common/Logo';

export const adminNav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Boxes },
  { href: '/admin/auctions', label: 'Auctions', icon: Gavel },
  { href: '/admin/banners', label: 'Banners', icon: Image },
  { href: '/admin/landing', label: 'Landing Page', icon: Sparkles },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/deposits', label: 'Deposits', icon: ArrowDownCircle },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowUpCircle },
  { href: '/admin/p2p', label: 'P2P', icon: Repeat2 },
  { href: '/admin/wallets', label: 'Wallet Bindings', icon: Landmark },
  { href: '/admin/income', label: 'Income', icon: BadgeDollarSign },
  { href: '/admin/wallet', label: 'Wallet Ops', icon: Wallet },
  { href: '/admin/compensation', label: 'Compensation', icon: Cpu },
  { href: '/admin/rewards', label: 'Rewards', icon: Gift },
  { href: '/admin/team', label: 'Genealogy', icon: Network },
  { href: '/admin/settings', label: 'Settings', icon: Settings }
];

function AdminNavLinks({ onNavigate }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {adminNav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${active ? 'bg-accent/20 text-accentSoft' : 'text-muted hover:bg-white/5 hover:text-text'}`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate, mobile = false, onClose }) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-8 flex flex-col items-center">
        <div className="flex w-full items-center justify-between lg:justify-center">
          <div className="rounded-lg bg-neutral-900 p-2">
            <Logo size={mobile ? 46 : 56} />
          </div>
          {mobile ? (
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text lg:hidden"
              aria-label="Close admin menu"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.25em] text-muted">Admin Console</p>
        <h1 className="text-center text-lg font-semibold text-accent">{THEME.appName}</h1>
        <p className="text-sm text-muted">Operational Control Center</p>
      </div>
      <AdminNavLinks onNavigate={onNavigate} />
    </div>
  );
}

export function AdminSidebar({ mobileOpen = false, onClose = () => {} }) {
  return (
    <>
      <aside className="hidden w-80 border-r border-white/10 bg-card lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            aria-label="Close admin navigation overlay"
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[320px] border-r border-white/10 bg-card shadow-2xl">
            <SidebarContent mobile onNavigate={onClose} onClose={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

