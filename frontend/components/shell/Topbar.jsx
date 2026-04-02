'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowDownToLine, ArrowUpFromLine, CircleDollarSign, Headset, LayoutGrid, UserRound, Wallet } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { isSeller } from '@/lib/constants/access';

function shortcutGroups(user, sellerActive) {
  return [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/wallet', label: 'Wallet', icon: Wallet },
    { href: '/deposit', label: 'Deposit', icon: ArrowDownToLine },
    { href: '/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
    { href: '/income', label: 'Income', icon: CircleDollarSign },
    { href: '/support', label: 'Support', icon: Headset },
    { href: (isSeller(user) || sellerActive) ? '/seller' : '/seller/apply', label: 'Seller', icon: UserRound }
  ];
}

export function Topbar({ user, sellerActive = false }) {
  const pathname = usePathname();
  const shortcuts = shortcutGroups(user, sellerActive);

  return (
    <Header
      className="mb-3.5"
      title={user?.first_name || user?.username || 'Hope Member'}
      subtitle="Wallets, auctions, support, and account controls in one place."
      rightSlot={
        <div className="hidden items-center gap-2 md:flex">
          {shortcuts.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${active ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] dark:bg-white dark:text-slate-950' : 'border border-[var(--hope-border)] bg-cardSoft text-muted hover:text-text'}`}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      }
    >
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold transition ${active ? 'bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] dark:bg-white dark:text-slate-950' : 'border border-[var(--hope-border)] bg-cardSoft text-muted'}`}
            >
              <Icon size={13} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </Header>
  );
}
