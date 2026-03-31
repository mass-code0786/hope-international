'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  Globe2,
  Headphones,
  LockKeyhole,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Wallet
} from 'lucide-react';
import Logo from '@/components/common/Logo';
import { ErrorState } from '@/components/ui/ErrorState';
import { getMe } from '@/lib/services/authService';
import { getPublicLandingPage, trackLandingVisit } from '@/lib/services/landingService';
import { useAuthStore } from '@/lib/store/authStore';
import { canAccessAdminArea, isSeller } from '@/lib/constants/access';
import { queryKeys } from '@/lib/query/queryKeys';

const iconMap = {
  'shield-check': ShieldCheck,
  shield: ShieldCheck,
  'globe-2': Globe2,
  globe: Globe2,
  sparkles: Sparkles,
  wallet: Wallet,
  users: Users,
  store: Store,
  support: Headphones,
  shopping: ShoppingBag,
  growth: TrendingUp,
  secure: LockKeyhole,
  trust: BadgeCheck
};

function resolveDestination(user) {
  if (canAccessAdminArea(user)) return '/admin';
  if (isSeller(user)) return '/seller';
  return '/auctions';
}

function ActionLink({ href, primary = false, children, compact = false }) {
  const className = primary
    ? `inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 ${compact ? 'px-4 py-2.5 text-sm' : 'px-5 py-3 text-sm'} font-semibold text-white shadow-[0_18px_32px_rgba(15,23,42,0.2)] transition hover:bg-slate-900`
    : `inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/75 ${compact ? 'px-4 py-2.5 text-sm' : 'px-5 py-3 text-sm'} font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white`;

  if (href.startsWith('#')) {
    return <a href={href} className={className}>{children}</a>;
  }

  return <Link href={href} className={className}>{children}</Link>;
}

function CountUp({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    let frame = 0;
    const totalFrames = 24;
    const timer = setInterval(() => {
      frame += 1;
      const progress = Math.min(frame / totalFrames, 1);
      setDisplay(Math.round(target * progress));
      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 35);

    return () => clearInterval(timer);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

function ReviewStars({ rating }) {
  return (
    <div className="flex items-center gap-1 text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index}>{index < rating ? '\u2605' : '\u2606'}</span>
      ))}
    </div>
  );
}

function getFlagEmoji(countryCode, providedFlag) {
  if (providedFlag && !/[?]/.test(providedFlag)) {
    return providedFlag;
  }

  const code = String(countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';

  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}

function BenefitCard({ item }) {
  const Icon = iconMap[item.iconName] || Sparkles;

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_26px_rgba(15,23,42,0.18)]">
        <Icon size={18} />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">{item.accentLabel || 'Benefit'}</p>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.bodyText}</p>
    </div>
  );
}

function FeaturedCard({ item }) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.1)]">
      <div className="relative h-56 overflow-hidden bg-slate-100">
        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[linear-gradient(135deg,#e0f2fe,#dcfce7)]" />}
        <div className="absolute left-4 top-4 inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
          {item.promoText || 'Featured'}
        </div>
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.priceLabel}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">{item.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <ActionLink href={item.targetLink || '/register'} primary>
            {item.ctaText || 'Explore'}
            <ArrowRight size={16} />
          </ActionLink>
        </div>
      </div>
    </div>
  );
}

function DetailBlock({ item }) {
  const reversed = item.layoutStyle === 'image-left';

  return (
    <div className={`grid gap-5 rounded-[32px] border border-white/70 bg-white/95 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:grid-cols-2 md:items-center ${reversed ? 'md:[&>div:first-child]:order-2' : ''}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">{item.accentLabel || 'Highlight'}</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{item.title}</h3>
        {item.subtitle ? <p className="mt-2 text-sm font-medium text-slate-500">{item.subtitle}</p> : null}
        <p className="mt-4 text-sm leading-7 text-slate-600">{item.bodyText}</p>
        {item.ctaText ? (
          <div className="mt-6">
            <ActionLink href={item.targetLink || '/register'} primary>
              {item.ctaText}
              <ArrowRight size={16} />
            </ActionLink>
          </div>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-[28px] bg-slate-100">
        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-72 w-full object-cover" /> : <div className="h-72 w-full bg-[linear-gradient(135deg,#dbeafe,#ecfccb)]" />}
      </div>
    </div>
  );
}

export default function PublicLandingPage() {
  const router = useRouter();
  const { token, hydrated, hydrate, clearSession } = useAuthStore();
  const visitorTrackedRef = useRef(false);

  useEffect(() => {
    if (!hydrated) {
      hydrate();
    }
  }, [hydrated, hydrate]);

  const landingQuery = useQuery({
    queryKey: queryKeys.landingPage,
    queryFn: getPublicLandingPage
  });

  const currentUserQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled: Boolean(hydrated && token),
    retry: false
  });

  const trackVisitMutation = useMutation({ mutationFn: trackLandingVisit });

  useEffect(() => {
    if (!hydrated || !token) return;
    if (currentUserQuery.data) {
      router.replace(resolveDestination(currentUserQuery.data));
    }
  }, [hydrated, token, currentUserQuery.data, router]);

  useEffect(() => {
    if (!currentUserQuery.isError) return;
    clearSession();
  }, [currentUserQuery.isError, clearSession]);

  useEffect(() => {
    if (!landingQuery.isSuccess || token || visitorTrackedRef.current) return;
    const storageKey = 'hope_landing_visitor';
    let visitorToken = '';
    try {
      visitorToken = window.localStorage.getItem(storageKey) || '';
      if (!visitorToken) {
        visitorToken = `hope-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
        window.localStorage.setItem(storageKey, visitorToken);
      }
    } catch (_error) {
      visitorToken = `hope-${Date.now().toString(36)}`;
    }

    visitorTrackedRef.current = true;
    trackVisitMutation.mutate(visitorToken);
  }, [landingQuery.isSuccess, token, trackVisitMutation]);

  const data = landingQuery.data;

  const sections = useMemo(() => {
    const visibility = data?.settings?.sectionVisibility || {};
    const order = Array.isArray(data?.settings?.sectionOrder) ? data.settings.sectionOrder : [];
    return order.filter((sectionKey) => visibility[sectionKey] !== false);
  }, [data]);

  if (hydrated && token && currentUserQuery.isLoading) {
    return <div className="min-h-screen bg-[#f5f7fb] px-6 py-16 text-center text-sm text-slate-500">Redirecting to your Hope workspace...</div>;
  }

  if (landingQuery.isLoading) {
    return <div className="min-h-screen bg-[#f5f7fb] px-6 py-16 text-center text-sm text-slate-500">Loading Hope International...</div>;
  }

  if (landingQuery.isError || !data) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] px-4 py-10">
        <ErrorState message="Unable to load the Hope International landing page." onRetry={landingQuery.refetch} />
      </div>
    );
  }

  const statsCards = [
    { label: 'Visitors', value: data.stats.totalVisitors },
    { label: 'Reviews', value: data.stats.totalReviews },
    { label: 'Members', value: data.stats.totalMembers }
  ];

  const repeatedCountries = [...data.countries, ...data.countries].map((item) => ({
    ...item,
    flagEmoji: getFlagEmoji(item.countryCode, item.flagEmoji)
  }));

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f7fb] text-slate-950">
      <style jsx global>{`
        @keyframes hopeLandingMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute right-[-8rem] top-40 h-80 w-80 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_transparent_42%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="rounded-[28px] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur sm:px-5">
          <div className="flex items-center justify-center gap-3 py-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm sm:h-12 sm:w-12">
              <Logo size={34} />
            </div>
            <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950 sm:text-base">Hope International</p>
          </div>
        </header>

        {sections.includes('hero') ? (
          <section className="pt-6 sm:pt-8">
            <div className="grid gap-6 rounded-[36px] border border-white/70 bg-white/80 p-5 shadow-[0_28px_80px_rgba(15,23,42,0.1)] backdrop-blur md:grid-cols-[1.15fr_0.85fr] md:p-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm">
                  <Sparkles size={14} className="text-sky-500" />
                  {data.settings.heroBadge}
                </div>
                <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.06em] text-slate-950 sm:text-5xl">
                  {data.settings.heroHeadline}
                </h1>
                <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                  {data.settings.heroSubheadline}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <ActionLink href="/register" primary>
                    {data.settings.heroPrimaryCtaText}
                    <ArrowRight size={16} />
                  </ActionLink>
                  <ActionLink href="/login">
                    {data.settings.heroSecondaryCtaText}
                  </ActionLink>
                </div>
                <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2"><ShieldCheck size={14} className="text-emerald-500" /> Secure account access</span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2"><Globe2 size={14} className="text-sky-500" /> Countries and regions</span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2"><Store size={14} className="text-violet-500" /> Products and seller updates</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a,#1e293b_55%,#0ea5e9)] p-5 text-white shadow-[0_26px_60px_rgba(15,23,42,0.22)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{data.settings.heroBackgroundNote}</p>
                  <p className="mt-3 max-w-xs text-sm leading-7 text-white/80">View products, explore updates, and create an account to get started.</p>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {statsCards.map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-4 backdrop-blur-sm">
                        <p className="text-lg font-semibold"><CountUp value={stat.value} /></p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/70">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  {data.settings.heroImageUrl ? (
                    <img src={data.settings.heroImageUrl} alt="Hope International highlight" className="h-64 w-full object-cover" />
                  ) : (
                    <div className="h-64 bg-[linear-gradient(135deg,#dbeafe,#f8fafc_45%,#dcfce7)]" />
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {sections.includes('featured') ? (
          <section id="featured" className="pt-12">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Featured products</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{data.settings.featuredSectionTitle}</h2>
              </div>
              <a href="#details" className="text-sm font-semibold text-sky-600">View more</a>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {data.featuredItems.map((item) => <FeaturedCard key={item.id} item={item} />)}
            </div>
          </section>
        ) : null}

        {sections.includes('benefits') ? (
          <section className="pt-12">
            <div className="mb-5 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Why choose us</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{data.settings.benefitsSectionTitle}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {data.benefits.map((item) => <BenefitCard key={item.id} item={item} />)}
            </div>
          </section>
        ) : null}

        {sections.includes('details') ? (
          <section id="details" className="pt-12">
            <div className="mb-5 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Highlights</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{data.settings.detailsSectionTitle}</h2>
            </div>
            <div className="space-y-5">
              {data.details.map((item) => <DetailBlock key={item.id} item={item} />)}
            </div>
          </section>
        ) : null}

        {sections.includes('testimonials') ? (
          <section className="pt-12">
            <div className="mb-5 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Testimonials</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{data.settings.testimonialsSectionTitle}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {data.testimonials.map((item) => (
                <div key={item.id} className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <ReviewStars rating={item.rating} />
                  <p className="mt-4 text-sm leading-7 text-slate-600">{item.reviewText}</p>
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="font-semibold text-slate-950">{item.reviewerName}</p>
                    <p className="text-sm text-slate-500">{item.reviewerRole || 'Hope member'}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {sections.includes('stats') ? (
          <section className="pt-12">
            <div className="rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,#ffffff,#eef6ff_55%,#f0fdf4)] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:p-7">
              <div className="mb-6 max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Public stats</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{data.settings.statsSectionTitle}</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {statsCards.map((stat) => (
                  <div key={stat.label} className="rounded-[28px] border border-white bg-white/85 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-950"><CountUp value={stat.value} /></p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {sections.includes('countries') ? (
          <section className="pt-12">
            <div className="mb-5 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Global reach</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{data.settings.countriesSectionTitle}</h2>
            </div>
            <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/90 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex w-max gap-3 px-4" style={{ animation: 'hopeLandingMarquee 24s linear infinite' }}>
                {repeatedCountries.map((item, index) => (
                  <div key={`${item.id || item.countryCode}-${index}`} className="inline-flex min-w-[158px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-2xl leading-none">{item.flagEmoji || '•'}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.countryName}</p>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.countryCode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {sections.includes('footer') ? (
          <footer className="pt-12 pb-8">
            <div className="rounded-[34px] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.2)] md:p-8">
              <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <Logo size={34} className="invert" />
                    </div>
                    <p className="text-base font-semibold tracking-[-0.02em] text-white">Hope International</p>
                  </div>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-white/75">{data.settings.footerSupportText}</p>
                  <p className="mt-3 text-sm font-medium text-white/90">{data.settings.footerContactEmail}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-white">Quick links</p>
                    <div className="mt-3 flex flex-col gap-2 text-white/75">
                      <a href="#featured">Featured</a>
                      <a href="#details">Highlights</a>
                      <Link href="/login">Login</Link>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Get started</p>
                    <div className="mt-3 flex flex-col gap-2 text-white/75">
                      <Link href="/register">Register</Link>
                      <Link href="/login">Login</Link>
                      <Link href="/register">Create account</Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
