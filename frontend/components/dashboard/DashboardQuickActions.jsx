import Link from 'next/link';
import { Gavel, Headset, Network, ShoppingBag, Store, UserRound, Wallet } from 'lucide-react';

const itemStyles = 'group rounded-[24px] border border-[var(--hope-border)] bg-card p-4 shadow-soft transition hover:-translate-y-0.5';

export function DashboardQuickActions({ sellerHref = '/seller/apply', sellerLabel = 'Apply Seller' }) {
  const actions = [
    { href: '/shop', label: 'Shop', helper: 'Browse products', icon: ShoppingBag },
    { href: '/team', label: 'Team', helper: 'Review referrals', icon: Network },
    { href: '/income', label: 'Income', helper: 'Track earnings', icon: Wallet },
    { href: '/support', label: 'Support', helper: 'Open tickets', icon: Headset },
    { href: '/profile', label: 'Profile', helper: 'Account details', icon: UserRound },
    { href: sellerHref, label: sellerLabel, helper: 'Seller tools', icon: Store },
    { href: '/auctions', label: 'Auctions', helper: 'Bid activity', icon: Gavel }
  ];

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.04em] text-text">Quick actions</h2>
          <p className="mt-1 text-sm text-muted">Fast access to the member tools you use most.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className={itemStyles}>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent">
                <Icon size={18} />
              </div>
              <p className="mt-4 text-sm font-semibold text-text">{action.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{action.helper}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
