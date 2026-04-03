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
  MoreHorizontal,
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

const landingImageKeywordPools = {
  hero: ['ecommerce,shopping', 'digital,technology', 'crypto,bitcoin'],
  featured: ['emerald,gemstone', 'digital,technology', 'crypto,bitcoin', 'social,media,marketing', 'ecommerce,shopping'],
  details: ['ecommerce,shopping', 'digital,technology', 'crypto,bitcoin', 'social,media,marketing', 'emerald,gemstone', 'ecommerce,shopping']
};

const semanticLandingImages = {
  'emerald,gemstone': 'https://source.unsplash.com/600x600/?emerald,gemstone',
  'digital,technology': 'https://source.unsplash.com/600x600/?digital,technology',
  'crypto,bitcoin': 'https://source.unsplash.com/600x600/?crypto,bitcoin',
  'social,media,marketing': 'https://source.unsplash.com/600x600/?social,media,marketing',
  'ecommerce,shopping': 'https://source.unsplash.com/600x600/?ecommerce,shopping'
};

const FINAL_IMAGE_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='900' viewBox='0 0 1200 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23312b45'/%3E%3Cstop offset='0.55' stop-color='%23202127'/%3E%3Cstop offset='1' stop-color='%232a3c33'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='900' fill='url(%23g)'/%3E%3Ccircle cx='930' cy='190' r='150' fill='rgba(139,61,255,0.2)'/%3E%3Ccircle cx='240' cy='710' r='170' fill='rgba(50,209,125,0.18)'/%3E%3Ctext x='90' y='760' fill='%23f5f7fb' font-family='Segoe UI, Arial, sans-serif' font-size='66' font-weight='700'%3EHope International%3C/text%3E%3Ctext x='90' y='828' fill='%23c0c7d4' font-family='Segoe UI, Arial, sans-serif' font-size='34'%3EPremium shopping visuals%3C/text%3E%3C/svg%3E";

function normalizeImageUrl(value) {
  return String(value || '').trim();
}

function buildLandingFallbackImage(keyword, seed) {
  const base = semanticLandingImages[keyword] || semanticLandingImages['ecommerce,shopping'];
  return `${base}&sig=${seed}`;
}

function inferLandingKeyword(text, section, index) {
  const value = String(text || '').toLowerCase();

  if (/(emerald|gem|gemstone|jewel|stone)/.test(value)) return 'emerald,gemstone';
  if (/(digital|technology|software|tool|seller|merchant|dashboard|pos|inventory)/.test(value)) return 'digital,technology';
  if (/(crypto|reward|token|coin|wallet|btct|bitcoin)/.test(value)) return 'crypto,bitcoin';
  if (/(social|youtube|facebook|instagram|marketing|growth|community|network)/.test(value)) return 'social,media,marketing';
  if (/(market|shop|shopping|product|catalog|ecommerce|auction|bid|service|support|customer)/.test(value)) return 'ecommerce,shopping';

  const pool = landingImageKeywordPools[section] || landingImageKeywordPools.featured;
  return pool[index % pool.length];
}

function resolveUniqueImage({ url, text, section, index, usedUrls }) {
  const source = normalizeImageUrl(url);
  if (source && !usedUrls.has(source)) {
    usedUrls.add(source);
    return source;
  }

  const keyword = inferLandingKeyword(text, section, index);
  const fallback = buildLandingFallbackImage(keyword, `${section}-${index}`);
  usedUrls.add(fallback);
  return fallback;
}

function LandingImage({ src, fallbackSrc = semanticLandingImages['ecommerce,shopping'], alt, className }) {
  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => {
    setImageSrc(src);
  }, [src]);

  return (
    <img
      src={imageSrc || fallbackSrc || FINAL_IMAGE_FALLBACK}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (imageSrc !== fallbackSrc) {
          setImageSrc(fallbackSrc);
          return;
        }
        if (imageSrc !== FINAL_IMAGE_FALLBACK) setImageSrc(FINAL_IMAGE_FALLBACK);
      }}
    />
  );
}

function HeaderMenuItem({ href, icon: Icon, label, onSelect }) {
  return (
    <a
      href={href}
      onClick={onSelect}
      className="group flex items-center justify-between rounded-[16px] border border-transparent px-3 py-3 text-sm font-medium text-[#f5f7fb] transition duration-200 hover:border-white/10 hover:bg-[linear-gradient(135deg,rgba(139,61,255,0.16),rgba(50,209,125,0.12))]"
    >
      <span className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] bg-[rgba(255,255,255,0.06)] text-[#d3d9e5] transition group-hover:bg-[rgba(255,255,255,0.1)] group-hover:text-white">
          <Icon size={16} />
        </span>
        <span>{label}</span>
      </span>
      <ArrowRight size={14} className="text-[#c0c7d4] transition group-hover:text-white" />
    </a>
  );
}

function resolveDestination(user) {
  if (canAccessAdminArea(user)) return '/admin';
  if (isSeller(user)) return '/seller';
  return '/auctions';
}

function sanitizeSecondaryCtaHref(href, fallback = '#details') {
  if (!href || href === '/login' || href === '/register') return fallback;
  return href;
}

function ActionLink({ href, primary = false, children, compact = false }) {
  const className = primary
    ? `inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#8b3dff,#32d17d)] ${compact ? 'px-4 py-2.5 text-sm' : 'px-5 py-3 text-sm'} font-semibold text-white shadow-[0_18px_32px_rgba(90,47,180,0.32)] transition hover:brightness-110`
    : `inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-[rgba(45,47,56,0.92)] ${compact ? 'px-4 py-2.5 text-sm' : 'px-5 py-3 text-sm'} font-semibold text-[#f5f7fb] transition hover:border-white/20 hover:bg-[rgba(56,58,68,0.96)]`;

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
    <div className="rounded-[28px] border border-white/10 bg-[#2b2d35] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8b3dff,#32d17d)] text-white shadow-[0_14px_26px_rgba(90,47,180,0.26)]">
        <Icon size={18} />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">{item.accentLabel || 'Benefit'}</p>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#f5f7fb]">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#c0c7d4]">{item.bodyText}</p>
    </div>
  );
}

function FeaturedCard({ item }) {
  const targetHref = sanitizeSecondaryCtaHref(item.targetLink, '#details');

  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#2b2d35] shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
      <div className="relative h-[180px] overflow-hidden rounded-[16px] bg-[#24262d]">
        <LandingImage src={item.resolvedImageUrl || FALLBACK_MARKETPLACE_IMAGE} alt={item.title} className="h-full w-full object-cover" />
        <div className="absolute left-4 top-4 inline-flex rounded-full border border-white/10 bg-[rgba(32,33,39,0.88)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f5f7fb] shadow-sm">
          {item.promoText || 'Featured'}
        </div>
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">{item.priceLabel}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#f5f7fb]">{item.title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#c0c7d4]">{item.description}</p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <ActionLink href={targetHref} primary>
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
  const targetHref = sanitizeSecondaryCtaHref(item.targetLink, '#featured');

  return (
    <div className={`grid gap-5 rounded-[32px] border border-white/10 bg-[#2b2d35] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)] md:grid-cols-2 md:items-center ${reversed ? 'md:[&>div:first-child]:order-2' : ''}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">{item.accentLabel || 'Highlight'}</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#f5f7fb]">{item.title}</h3>
        {item.subtitle ? <p className="mt-2 text-sm font-medium text-[#d3d9e5]">{item.subtitle}</p> : null}
        <p className="mt-4 text-sm leading-7 text-[#c0c7d4]">{item.bodyText}</p>
        {item.ctaText ? (
          <div className="mt-6">
            <ActionLink href={targetHref} primary>
              {item.ctaText}
              <ArrowRight size={16} />
            </ActionLink>
          </div>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-[28px] bg-[#24262d]">
        <LandingImage src={item.resolvedImageUrl || FALLBACK_MARKETPLACE_IMAGE} alt={item.title} className="h-[180px] w-full object-cover" />
      </div>
    </div>
  );
}

export default function PublicLandingPage() {
  const router = useRouter();
  const { token, hydrated, hydrate, clearSession } = useAuthStore();
  const visitorTrackedRef = useRef(false);
  const headerMenuRef = useRef(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!headerMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!headerMenuRef.current?.contains(event.target)) {
        setHeaderMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [headerMenuOpen]);

  const data = landingQuery.data;
  const settings = data?.settings || {};
  const featuredItems = Array.isArray(data?.featuredItems) ? data.featuredItems : [];
  const benefitItems = Array.isArray(data?.benefits) ? data.benefits : [];
  const detailItems = Array.isArray(data?.details) ? data.details : [];
  const testimonialItems = Array.isArray(data?.testimonials) ? data.testimonials : [];
  const countryItems = Array.isArray(data?.countries) ? data.countries : [];
  const stats = data?.stats || {};

  const sections = useMemo(() => {
    const visibility = settings.sectionVisibility || {};
    const order = Array.isArray(settings.sectionOrder) ? settings.sectionOrder : [];
    return order.filter((sectionKey) => visibility[sectionKey] !== false);
  }, [settings]);

  const statsCards = useMemo(() => ([
    { label: 'Visitors', value: stats.totalVisitors },
    { label: 'Reviews', value: stats.totalReviews },
    { label: 'Members', value: stats.totalMembers }
  ]), [stats.totalMembers, stats.totalReviews, stats.totalVisitors]);

  const repeatedCountries = useMemo(() => (
    [...countryItems, ...countryItems].map((item) => ({
      ...item,
      flagEmoji: getFlagEmoji(item.countryCode, item.flagEmoji)
    }))
  ), [countryItems]);

  const landingImages = useMemo(() => {
    const usedUrls = new Set();
    const heroImageUrl = resolveUniqueImage({
      url: settings.heroImageUrl,
      text: `${settings.heroHeadline || ''} ${settings.heroSubheadline || ''}`,
      section: 'hero',
      index: 0,
      usedUrls
    });

    const resolvedFeaturedItems = featuredItems.map((item, index) => ({
      ...item,
      resolvedImageUrl: resolveUniqueImage({
        url: item.imageUrl,
        text: `${item.title} ${item.description} ${item.promoText}`,
        section: 'featured',
        index,
        usedUrls
      })
    }));

    const resolvedDetailItems = detailItems.map((item, index) => ({
      ...item,
      resolvedImageUrl: resolveUniqueImage({
        url: item.imageUrl,
        text: `${item.title} ${item.subtitle || ''} ${item.bodyText}`,
        section: 'details',
        index,
        usedUrls
      })
    }));

    return {
      heroImageUrl,
      featuredItems: resolvedFeaturedItems,
      detailItems: resolvedDetailItems
    };
  }, [
    detailItems,
    featuredItems,
    settings.heroHeadline,
    settings.heroImageUrl,
    settings.heroSubheadline
  ]);

  if (hydrated && token && currentUserQuery.isLoading) {
    return <div className="min-h-screen bg-[#1f2026] px-6 py-16 text-center text-sm text-[#c0c7d4]">Redirecting to your Hope workspace...</div>;
  }

  if (landingQuery.isLoading) {
    return <div className="min-h-screen bg-[#1f2026] px-6 py-16 text-center text-sm text-[#c0c7d4]">Loading Hope International...</div>;
  }

  if (landingQuery.isError || !data) {
    return (
      <div className="min-h-screen bg-[#1f2026] px-4 py-10">
        <ErrorState message="Unable to load the Hope International landing page." onRetry={landingQuery.refetch} />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#1f2026] text-[#f5f7fb]">
      <style jsx global>{`
        @keyframes hopeLandingMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes hopeMenuIn {
          0% { opacity: 0; transform: translateY(-6px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-[#8b3dff]/18 blur-3xl" />
        <div className="absolute right-[-8rem] top-40 h-80 w-80 rounded-full bg-[#32d17d]/14 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,61,255,0.14),_transparent_42%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="sticky top-3 z-30 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(42,44,52,0.96),rgba(34,35,42,0.94))] px-3 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:top-5 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3 rounded-[22px] px-1 py-1.5">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,#2f3139,#24262d)] shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
                <div className="absolute inset-[3px] rounded-[16px] bg-[radial-gradient(circle_at_top,_rgba(139,61,255,0.22),_transparent_52%),linear-gradient(180deg,#32343d,#272930)]" />
                <div className="relative">
                  <Logo size={34} />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#a78bfa]">Hope</p>
                <p className="truncate text-sm font-semibold tracking-[-0.03em] text-[#f5f7fb] sm:text-[15px]">International</p>
              </div>
            </Link>

            <div ref={headerMenuRef} className="relative">
              <button
                type="button"
                aria-label="Open header menu"
                onClick={() => setHeaderMenuOpen((prev) => !prev)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(48,50,60,0.94),rgba(34,35,42,0.94))] text-[#f5f7fb] shadow-[0_10px_24px_rgba(0,0,0,0.2)] backdrop-blur-xl transition duration-200 hover:-translate-y-[1px] hover:border-[rgba(139,61,255,0.28)] hover:shadow-[0_14px_28px_rgba(90,47,180,0.22)]"
              >
                <MoreHorizontal size={18} />
              </button>

              {headerMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-64 rounded-[22px] border border-[rgba(255,255,255,0.12)] bg-[rgba(31,32,38,0.88)] p-2.5 shadow-[0_24px_52px_rgba(0,0,0,0.32)] backdrop-blur-2xl animate-[hopeMenuIn_180ms_ease-out]">
                  <div className="mb-2 rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(139,61,255,0.16),rgba(50,209,125,0.08))] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d3d9e5]">Quick Menu</p>
                    <p className="mt-1 text-xs text-[#c0c7d4]">Clean premium experience</p>
                  </div>
                  <HeaderMenuItem href="#featured" icon={ShoppingBag} label="Explore Featured" onSelect={() => setHeaderMenuOpen(false)} />
                  <HeaderMenuItem href="#details" icon={Sparkles} label="View Highlights" onSelect={() => setHeaderMenuOpen(false)} />
                  <HeaderMenuItem href={`mailto:${settings.footerContactEmail || 'support@example.com'}`} icon={Headphones} label="Contact Support" onSelect={() => setHeaderMenuOpen(false)} />
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {sections.includes('hero') ? (
          <section className="pt-6 sm:pt-8">
            <div className="grid gap-6 rounded-[36px] border border-white/10 bg-[rgba(43,45,53,0.96)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur md:grid-cols-[1.15fr_0.85fr] md:p-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(32,33,39,0.88)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d3d9e5] shadow-sm">
                  <Sparkles size={14} className="text-[#a78bfa]" />
                  {settings.heroBadge}
                </div>
                <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.06em] text-[#f5f7fb] sm:text-5xl">
                  {settings.heroHeadline}
                </h1>
                <p className="mt-4 max-w-xl text-base leading-8 text-[#c0c7d4]">
                  {settings.heroSubheadline}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <ActionLink href="/register" primary>
                    {settings.heroPrimaryCtaText}
                    <ArrowRight size={16} />
                  </ActionLink>
                  <ActionLink href="/login">
                    {settings.heroSecondaryCtaText}
                  </ActionLink>
                </div>
                <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-[#d3d9e5]">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(32,33,39,0.88)] px-3 py-2"><ShieldCheck size={14} className="text-[#32d17d]" /> Secure account access</span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(32,33,39,0.88)] px-3 py-2"><Globe2 size={14} className="text-[#a78bfa]" /> Countries and regions</span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(32,33,39,0.88)] px-3 py-2"><Store size={14} className="text-[#f6b73c]" /> Products and seller updates</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#272830,#31294a_55%,#214133)] p-5 text-white shadow-[0_26px_60px_rgba(0,0,0,0.24)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">{settings.heroBackgroundNote}</p>
                  <p className="mt-3 max-w-xs text-sm leading-7 text-white/90">View products, explore updates, and create an account to get started.</p>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {statsCards.map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-white/12 bg-white/10 px-3 py-4 backdrop-blur-sm">
                        <p className="text-lg font-semibold"><CountUp value={stat.value} /></p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/85">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#2b2d35] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
                  <LandingImage src={landingImages.heroImageUrl || FALLBACK_MARKETPLACE_IMAGE} alt="Hope International highlight" className="h-[180px] w-full object-cover" />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {sections.includes('featured') ? (
          <section id="featured" className="pt-12">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d3d9e5]">Featured products</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#f5f7fb]">{settings.featuredSectionTitle}</h2>
              </div>
              <a href="#details" className="text-sm font-semibold text-[#a78bfa]">View more</a>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {landingImages.featuredItems.map((item) => <FeaturedCard key={item.id} item={item} />)}
            </div>
          </section>
        ) : null}

        {sections.includes('benefits') ? (
          <section className="pt-12">
            <div className="mb-5 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d3d9e5]">Why choose us</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#f5f7fb]">{settings.benefitsSectionTitle}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {benefitItems.map((item) => <BenefitCard key={item.id} item={item} />)}
            </div>
          </section>
        ) : null}

        {sections.includes('details') ? (
          <section id="details" className="pt-12">
            <div className="mb-5 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d3d9e5]">Highlights</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#f5f7fb]">{settings.detailsSectionTitle}</h2>
            </div>
            <div className="space-y-5">
              {landingImages.detailItems.map((item) => <DetailBlock key={item.id} item={item} />)}
            </div>
          </section>
        ) : null}

        {sections.includes('testimonials') ? (
          <section className="pt-12">
            <div className="mb-5 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d3d9e5]">Testimonials</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#f5f7fb]">{settings.testimonialsSectionTitle}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {testimonialItems.map((item) => (
                <div key={item.id} className="rounded-[28px] border border-white/10 bg-[#2b2d35] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
                  <ReviewStars rating={item.rating} />
                  <p className="mt-4 text-sm leading-7 text-[#c0c7d4]">{item.reviewText}</p>
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="font-semibold text-[#f5f7fb]">{item.reviewerName}</p>
                    <p className="text-sm text-[#d3d9e5]">{item.reviewerRole || 'Hope member'}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {sections.includes('stats') ? (
          <section className="pt-12">
            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,#2c2e37,#252730_55%,#233329)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] md:p-7">
              <div className="mb-6 max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d3d9e5]">Public stats</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#f5f7fb]">{settings.statsSectionTitle}</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {statsCards.map((stat) => (
                  <div key={stat.label} className="rounded-[28px] border border-white/10 bg-[rgba(32,33,39,0.7)] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d3d9e5]">{stat.label}</p>
                    <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#f5f7fb]"><CountUp value={stat.value} /></p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {sections.includes('countries') ? (
          <section className="pt-12">
            <div className="mb-5 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d3d9e5]">Global reach</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#f5f7fb]">{settings.countriesSectionTitle}</h2>
            </div>
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#2b2d35] py-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
              <div className="flex w-max gap-3 px-4" style={{ animation: 'hopeLandingMarquee 24s linear infinite' }}>
                {repeatedCountries.map((item, index) => (
                  <div key={`${item.id || item.countryCode}-${index}`} className="inline-flex min-w-[158px] items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(32,33,39,0.78)] px-4 py-3">
                    <span className="text-2xl leading-none">{item.flagEmoji || '•'}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#f5f7fb]">{item.countryName}</p>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#d3d9e5]">{item.countryCode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {sections.includes('footer') ? (
          <footer className="pt-12 pb-8">
            <div className="rounded-[34px] border border-white/10 bg-[#24262d] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.26)] md:p-8">
              <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(139,61,255,0.14)]">
                      <Logo size={34} />
                    </div>
                    <p className="text-base font-semibold tracking-[-0.02em] text-[#f5f7fb]">Hope International</p>
                  </div>
                  <p className="mt-5 max-w-xl text-sm leading-7 text-[#c0c7d4]">{settings.footerSupportText}</p>
                  <p className="mt-3 text-sm font-medium text-[#f5f7fb]">{settings.footerContactEmail}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-[#f5f7fb]">Quick links</p>
                    <div className="mt-3 flex flex-col gap-2 text-[#c0c7d4]">
                      <a href="#featured">Featured</a>
                      <a href="#details">Highlights</a>
                      <a href="#details">Benefits</a>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-[#f5f7fb]">Get started</p>
                    <div className="mt-3 flex flex-col gap-2 text-[#c0c7d4]">
                      <a href="#featured">Explore products</a>
                      <a href="#details">Platform highlights</a>
                      <a href={`mailto:${settings.footerContactEmail}`}>Contact support</a>
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
