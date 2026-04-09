import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import Logo from '@/components/common/Logo';
import { Badge } from '@/components/ui/Badge';
import { shortDate, rankLabel } from '@/lib/utils/format';

function statusVariant(isActive) {
  return isActive === false ? 'danger' : 'success';
}

export function DashboardHero({ user, referralCode, sponsorLabel, placementLabel, teamSize, activeTeam }) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.username || 'Hope Member';

  return (
    <section className="card-surface relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(217,119,6,0.14),transparent_28%)]" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="hope-kicker"><Sparkles size={12} /> Premium dashboard</span>
            <Badge variant={statusVariant(user?.is_active)}>Account {user?.is_active === false ? 'Inactive' : 'Active'}</Badge>
          </div>
          <div className="mt-5 flex items-start gap-4">
            <Logo size={56} className="hidden shrink-0 sm:block" />
            <div>
              <p className="text-sm text-muted">Welcome back</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.06em] text-text sm:text-4xl">{fullName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">Referral code <span className="font-semibold text-text">{referralCode || 'Unavailable'}</span> | Rank <span className="font-semibold text-text">{rankLabel(user?.rank_name)}</span> | Joined {shortDate(user?.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
          <Info label="Sponsor" value={sponsorLabel} />
          <Info label="Placement" value={placementLabel} />
          <Info label="Team Size" value={teamSize} />
          <Info label="Active Team" value={activeTeam} />
        </div>
      </div>
      <div className="relative mt-5 flex flex-wrap gap-3">
        <Link href="/shop" className="hope-button">Open shop <ArrowRight size={15} /></Link>
        <Link href="/team" className="hope-button-secondary"><ShieldCheck size={15} /> Review team</Link>
      </div>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-[22px] border border-[var(--hope-border)] bg-cardSoft px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-text">{value || 'N/A'}</p>
    </div>
  );
}
