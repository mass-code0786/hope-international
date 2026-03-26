'use client';

import { ShoppingBag, Network, Wallet, Share2 } from 'lucide-react';
import Link from 'next/link';

const actions = [
  { label: 'Buy Product', href: '/shop', icon: ShoppingBag },
  { label: 'View Team', href: '/team', icon: Network },
  { label: 'Withdraw', href: '/income', icon: Wallet },
  { label: 'Share Referral', href: '/profile', icon: Share2 }
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link key={action.label} href={action.href} className="card-surface flex items-center gap-3 p-4 hover:border-accent/[0.28] hover:bg-cardSoft/[0.85]">
            <span className="rounded-xl border border-accent/[0.30] bg-accent/[0.12] p-2 text-accentSoft"><Icon size={16} /></span>
            <span className="text-sm text-text">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
