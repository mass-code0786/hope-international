'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LayoutDashboard, Users, Boxes, ShoppingCart, Wallet, Cpu, Gift, Network, Settings, Image, ArrowDownCircle, ArrowUpCircle, Repeat2, Landmark, BadgeDollarSign, Gavel, Sparkles, Headset, Images } from 'lucide-react';
import { THEME } from '@/lib/constants/theme';
import { canAccessSuperAdminArea } from '@/lib/constants/access';
import Logo from '@/components/common/Logo';

export const adminNav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Boxes },
  { href: '/admin/auctions', label: 'Auctions', icon: Gavel },
  { href: '/admin/banners', label: 'Banners', icon: Image },
  { href: '/admin/landing', label: 'Landing Page', icon: Sparkles },
  { href: '/admin/gallery', label: 'Gallery', icon: Images },
  { href: '/admin/support', label: 'Support', icon: Headset },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/deposits', label: 'Deposits', icon: ArrowDownCircle, superAdminOnly: true },
  { href: '/admin/nowpayments', label: 'NOWPayments', icon: ArrowDownCircle, superAdminOnly: true },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowUpCircle },
  { href: '/admin/p2p', label: 'P2P', icon: Repeat2 },
  { href: '/admin/wallets', label: 'Wallet Bindings', icon: Landmark },
  { href: '/admin/income', label: 'Income', icon: BadgeDollarSign },
  { href: '/admin/wallet', label: 'Wallet Ops', icon: Wallet },
  { href: '/admin/compensation', label: 'Compensation', icon: Cpu },
  { href: '/admin/rewards', label: 'Rewards', icon: Gift },
  { href: '/admin/team', label: 'Genealogy', icon: Network },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const adminGroups = [
  { title: 'Overview', items: ['/admin'] },
  { title: 'Commerce', items: ['/admin/products', '/admin/orders', '/admin/auctions', '/admin/banners', '/admin/landing', '/admin/gallery', '/admin/support'] },
  { title: 'Finance', items: ['/admin/deposits', '/admin/nowpayments', '/admin/withdrawals', '/admin/p2p', '/admin/wallets', '/admin/income', '/admin/wallet'] },
  { title: 'Network', items: ['/admin/users', '/admin/compensation', '/admin/rewards', '/admin/team', '/admin/settings'] }
];

function AdminNavLinks({ onNavigate, user }) {
  const pathname = usePathname();
  const superAdmin = canAccessSuperAdminArea(user);

  return (
    <nav className="space-y-5">
      {adminGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">{group.title}</p>
          <div className="space-y-2">
            {group.items.map((href) => {
              const item = adminNav.find((entry) => entry.href === href);
              if (!item) return null;
              if (item.superAdminOnly && !superAdmin) return null;
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
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate, mobile = false, onClose, user }) {
  return (
    <div className="h-full overflow-y-auto p-6 text-white">
      <div className="mb-8 rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_64px_rgba(2,8,23,0.28)] backdrop-blur">
        <div className="flex w-full items-center justify-between lg:justify-start lg:gap-3">
          <Logo size={mobile ? 54 : 62} className="shrink-0" />
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
        <p className="mt-2 text-sm text-white/65">Operational control center for products, finance, support, users, content, and growth systems.</p>
      </div>
      <AdminNavLinks onNavigate={onNavigate} user={user} />
    </div>
  );
}

export function AdminSidebar({ mobileOpen = false, onClose = () => {}, user = null }) {
  return (
    <>
      <aside className="hidden w-80 border-r border-white/10 bg-[linear-gradient(180deg,rgba(6,16,27,0.98),rgba(11,23,36,0.96))] lg:block">
        <SidebarContent user={user} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            aria-label="Close admin navigation overlay"
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[320px] border-r border-white/10 bg-[linear-gradient(180deg,rgba(6,16,27,0.99),rgba(11,23,36,0.98))] shadow-2xl">
            <SidebarContent user={user} mobile onNavigate={onClose} onClose={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

