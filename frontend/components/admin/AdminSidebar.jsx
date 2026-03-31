'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LayoutDashboard, Users, Boxes, ShoppingCart, Wallet, Cpu, Gift, Network, Settings, Image, ArrowDownCircle, ArrowUpCircle, Repeat2, Landmark, BadgeDollarSign, Gavel, Sparkles, Headset } from 'lucide-react';
import { THEME } from '@/lib/constants/theme';
import Logo from '@/components/common/Logo';

export const adminNav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Boxes },
  { href: '/admin/auctions', label: 'Auctions', icon: Gavel },
  { href: '/admin/banners', label: 'Banners', icon: Image },
  { href: '/admin/landing', label: 'Landing Page', icon: Sparkles },
  { href: '/admin/support', label: 'Support', icon: Headset },
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
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/settings/deposit-wallet', label: 'Deposit Wallet', icon: ArrowDownCircle }
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
  );
}

function SidebarContent({ onNavigate, mobile = false, onClose }) {
  return (
    <div className="h-full overflow-y-auto p-6 text-white">
      <div className="mb-8 rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_64px_rgba(2,8,23,0.28)] backdrop-blur">
        <div className="flex w-full items-center justify-between lg:justify-start lg:gap-3">
          <div className="rounded-[22px] bg-white/95 p-2.5 shadow-sm">
            <Logo size={mobile ? 46 : 54} />
          </div>
          {mobile ? (
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-text lg:hidden"
              aria-label="Close admin menu"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-white/55">Admin Console</p>
        <h1 className="mt-2 text-xl font-semibold tracking-[-0.05em] text-white">{THEME.appName}</h1>
        <p className="mt-2 text-sm text-white/65">Operational control center for finance, support, users, and growth systems.</p>
      </div>
      <AdminNavLinks onNavigate={onNavigate} />
    </div>
  );
}

export function AdminSidebar({ mobileOpen = false, onClose = () => {} }) {
  return (
    <>
      <aside className="hidden w-80 border-r border-white/10 bg-[linear-gradient(180deg,rgba(6,16,27,0.98),rgba(11,23,36,0.96))] lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            aria-label="Close admin navigation overlay"
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[320px] border-r border-white/10 bg-[linear-gradient(180deg,rgba(6,16,27,0.99),rgba(11,23,36,0.98))] shadow-2xl">
            <SidebarContent mobile onNavigate={onClose} onClose={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

