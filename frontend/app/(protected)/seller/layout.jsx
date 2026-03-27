'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sellerTabs = [
  { href: '/seller', label: 'Dashboard' },
  { href: '/seller/products', label: 'Products' },
  { href: '/seller/profile', label: 'Profile' },
  { href: '/seller/apply', label: 'Application' }
];

export default function SellerLayout({ children }) {
  const pathname = usePathname();
  const isApplyRoute = pathname === '/seller/apply' || pathname.startsWith('/seller/apply/');

  return (
    <div className="space-y-3">
      {isApplyRoute ? null : (
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <div className="flex min-w-max gap-1.5 overflow-x-auto">
            {sellerTabs.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] ${active ? 'bg-sky-100 text-sky-700' : 'border border-slate-200 bg-white text-slate-600'}`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
