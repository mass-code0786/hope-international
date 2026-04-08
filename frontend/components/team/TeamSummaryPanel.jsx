import { motion } from 'framer-motion';
import { ArrowLeftRight, Crown, Network, Sparkles, UsersRound } from 'lucide-react';
import { number } from '@/lib/utils/format';

export function TeamSummaryPanel({ me, teamSummary = {}, children = [] }) {
  const leftPv = Number(teamSummary?.left_pv ?? me?.carry_left_pv ?? 0);
  const rightPv = Number(teamSummary?.right_pv ?? me?.carry_right_pv ?? 0);
  const matchedPotential = Number(teamSummary?.matched_potential ?? Math.min(leftPv, rightPv));
  const totalDirects = Number(teamSummary?.direct_referral_count ?? children.length ?? 0);
  const activeDirects = children.filter((child) => child?.isActive !== false && child?.is_active !== false).length;
  const totalTeam = Number(teamSummary?.total_descendants || totalDirects || 0);
  const activeTeam = Number(teamSummary?.active_count || activeDirects || 0);
  const leftTeam = Number(teamSummary?.left_team_count ?? teamSummary?.left_count ?? 0);
  const rightTeam = Number(teamSummary?.right_team_count ?? teamSummary?.right_count ?? 0);
  const sponsorName = [me?.sponsor_first_name, me?.sponsor_last_name].filter(Boolean).join(' ').trim();
  const sponsor = sponsorName || me?.sponsor_username || 'No sponsor assigned';
  const hasSponsor = sponsor !== 'No sponsor assigned';
  const placementSource = teamSummary?.placement_side ?? me?.placement_side;
  const placement = placementSource
    ? `${String(placementSource).charAt(0).toUpperCase()}${String(placementSource).slice(1)} leg`
    : 'Pending placement';

  const totalPv = leftPv + rightPv;
  const leftShare = totalPv > 0 ? Math.min(95, Math.max(5, Math.round((leftPv / totalPv) * 100))) : 50;
  const rightShare = 100 - leftShare;
  const sideGap = Math.abs(leftPv - rightPv);
  const isBalanced = sideGap === 0;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <PrimaryCard
          label="Total Team"
          value={number(totalTeam)}
          subtext={`${number(totalDirects)} direct referrals`}
          icon={UsersRound}
          tint="from-[#9f5dff] via-[#7c3aed] to-[#34d399]"
          glow="shadow-[0_18px_36px_rgba(124,58,237,0.28)]"
        />
        <PrimaryCard
          label="Active Team"
          value={number(activeTeam)}
          subtext={`${number(Math.max(totalTeam - activeTeam, 0))} inactive`}
          icon={Sparkles}
          tint="from-[#34d399] via-[#10b981] to-[#7c3aed]"
          glow="shadow-[0_18px_36px_rgba(16,185,129,0.24)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <SecondaryCard
          label="Direct Referrals"
          value={number(totalDirects)}
          icon={Network}
          tone="from-[rgba(124,58,237,0.24)] to-[rgba(56,189,248,0.12)]"
        />
        <SecondaryCard
          label="Placement Side"
          value={placement}
          icon={ArrowLeftRight}
          tone="from-[rgba(16,185,129,0.2)] to-[rgba(139,92,246,0.12)]"
        />
      </div>

      <SponsorCard sponsor={sponsor} hasSponsor={hasSponsor} />

      <BinaryComparisonCard
        leftTeam={leftTeam}
        rightTeam={rightTeam}
        leftPv={leftPv}
        rightPv={rightPv}
        leftShare={leftShare}
        rightShare={rightShare}
        matchedPotential={matchedPotential}
        sideGap={sideGap}
        isBalanced={isBalanced}
      />
    </div>
  );
}

function GlowIcon({ icon: Icon, className = '' }) {
  return (
    <span className={`inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[1rem] border border-white/10 bg-[linear-gradient(135deg,rgba(157,78,221,0.22),rgba(16,185,129,0.16))] text-white shadow-[0_8px_18px_rgba(124,58,237,0.2)] ${className}`}>
      <Icon size={14} />
    </span>
  );
}

function PrimaryCard({ label, value, subtext, icon, tint, glow }) {
  return (
    <motion.article
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      className={`group relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[rgba(16,18,26,0.76)] px-3.5 py-3 backdrop-blur-xl ${glow}`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]`} />
      <div className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gradient-to-br ${tint} opacity-30 blur-2xl`} />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/58">{label}</p>
        <GlowIcon icon={icon} />
      </div>
      <p className="relative mt-2 text-[1.65rem] font-semibold tracking-[-0.055em] text-white">{value}</p>
      <p className="relative mt-0.5 text-[10px] text-white/58">{subtext}</p>
    </motion.article>
  );
}

function SecondaryCard({ label, value, icon, tone }) {
  return (
    <motion.article
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[rgba(16,18,26,0.72)] px-3.5 py-3 backdrop-blur-xl"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone} opacity-40`} />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/52">{label}</p>
        <GlowIcon icon={icon} className="h-8 w-8 rounded-[0.9rem]" />
      </div>
      <p className="relative mt-2 break-words text-[0.98rem] font-semibold tracking-[-0.03em] text-white">{value}</p>
    </motion.article>
  );
}

function SponsorCard({ sponsor, hasSponsor }) {
  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[rgba(16,18,26,0.72)] px-3.5 py-3 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(124,58,237,0.16),rgba(16,185,129,0.08))]" />
      <div className={`relative flex ${hasSponsor ? 'items-center justify-between' : 'flex-col items-center justify-center text-center'} gap-2.5`}>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/56">Sponsor</p>
          {hasSponsor ? (
            <p className="mt-1.5 text-[0.98rem] font-semibold tracking-[-0.03em] text-white break-words">{sponsor}</p>
          ) : (
            <p className="mt-1.5 text-[13px] font-semibold text-white/82">No sponsor assigned</p>
          )}
        </div>
        <span className={`inline-flex h-[34px] w-[34px] items-center justify-center rounded-[1rem] border border-white/10 ${hasSponsor ? 'bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(16,185,129,0.18))] shadow-[0_8px_18px_rgba(124,58,237,0.2)]' : 'bg-[rgba(255,255,255,0.05)] text-white/70'}`}>
          <Crown size={14} />
        </span>
      </div>
    </motion.article>
  );
}

function BinaryComparisonCard({
  leftTeam,
  rightTeam,
  leftPv,
  rightPv,
  leftShare,
  rightShare,
  matchedPotential,
  sideGap,
  isBalanced
}) {
  return (
    <motion.section
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[rgba(14,16,24,0.78)] px-3.5 py-3 shadow-[0_20px_45px_rgba(0,0,0,0.34)] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute -left-16 top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.28),transparent_70%)]" />
      <div className="pointer-events-none absolute -right-14 bottom-3 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.22),transparent_70%)]" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/52">Binary Balance</p>
          <p className="mt-0.5 text-[0.95rem] font-semibold tracking-[-0.025em] text-white">Left vs Right Performance</p>
        </div>
        <GlowIcon icon={ArrowLeftRight} />
      </div>

      <div className="relative mt-3 rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2.5">
        <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.14em] text-white/62">
          <span>Left {number(leftTeam)}</span>
          <span>Right {number(rightTeam)}</span>
        </div>

        <div className="relative mt-2.5 h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
          <div className="flex h-full">
            <div
              className="h-full bg-[linear-gradient(90deg,#a855f7,#7c3aed)]"
              style={{ width: `${leftShare}%` }}
            />
            <div
              className="h-full bg-[linear-gradient(90deg,#22c55e,#10b981)]"
              style={{ width: `${rightShare}%` }}
            />
          </div>
          <div className="absolute left-1/2 top-[-1px] h-4 w-[2px] -translate-x-1/2 rounded-full bg-white/65" />
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-[1rem] border border-purple-300/20 bg-[rgba(124,58,237,0.16)] px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/62">Left PV</p>
            <p className="mt-0.5 text-[1.05rem] font-semibold tracking-[-0.03em] text-white">{number(leftPv)}</p>
          </div>
          <div className="rounded-[1rem] border border-emerald-300/20 bg-[rgba(16,185,129,0.14)] px-3 py-2.5 text-right">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/62">Right PV</p>
            <p className="mt-0.5 text-[1.05rem] font-semibold tracking-[-0.03em] text-white">{number(rightPv)}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-2.5 grid grid-cols-2 gap-2.5">
        <div className="rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.04)] px-3 py-2.5">
          <p className="text-[9px] uppercase tracking-[0.14em] text-white/52">Matched Potential</p>
          <p className="mt-0.5 text-[1.05rem] font-semibold tracking-[-0.03em] text-white">{number(matchedPotential)}</p>
        </div>
        <div className="rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-right">
          <p className="text-[9px] uppercase tracking-[0.14em] text-white/52">Balance Gap</p>
          <p className={`mt-0.5 text-[1.05rem] font-semibold tracking-[-0.03em] ${isBalanced ? 'text-emerald-300' : 'text-white'}`}>
            {number(sideGap)}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
