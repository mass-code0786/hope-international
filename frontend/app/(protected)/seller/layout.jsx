'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoFull, LogoMark } from '@/components/brand/HopeLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const sellerTabs = [
  { href: '/seller', label: 'Dashboard' },
  { href: '/seller/products', label: 'Products' },
  { href: '/seller/profile', label: 'Profile' },
  { href: '/seller/apply', label: 'Application' }
];

export default function SellerLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <div className="card-surface overflow-x-auto overflow-y-visible border-white/[0.2] bg-gradient-to-br from-cardSoft/[0.98] via-cardSoft/[0.96] to-card/[0.95] p-2">
        <div className="mb-2 flex items-center justify-between gap-2 px-2 py-1">
          <div className="inline-flex items-center gap-2.5">
            <span className="inline-flex shrink-0 items-center justify-center rounded-xl border border-accent/[0.5] bg-gradient-to-br from-black/65 to-[#0b1324] p-1.5 shadow-[0_0_0_1px_rgba(212,175,55,0.12)] sm:hidden">
              <LogoMark size={32} />
            </span>
            <span className="hidden sm:inline-flex"><LogoFull size={88} /></span>
            <span className="hidden min-[390px]:inline text-[11px] font-semibold uppercase tracking-[0.14em] text-accentSoft/95 sm:hidden">
              Hope International
            </span>
          </div>
          <p className="text-sm font-semibold text-accentSoft">Seller Console</p>
          <ThemeToggle />
        </div>
        <div className="flex min-w-max gap-2">
          {sellerTabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-xl px-4 py-2 text-sm ${active ? 'bg-accent/20 text-accentSoft' : 'text-muted hover:bg-white/5 hover:text-text'}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
