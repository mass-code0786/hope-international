'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Globe2,
  Headphones,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  Store,
  Trophy,
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

const fallbackImages = {
  ecommerce: 'https://source.unsplash.com/900x700/?ecommerce,shopping',
  seller: 'https://source.unsplash.com/900x700/?seller,store,management',
  digital: 'https://source.unsplash.com/900x700/?digital,technology',
  crypto: 'https://source.unsplash.com/900x700/?crypto,bitcoin',
  auction: 'https://source.unsplash.com/900x700/?auction,business',
  support: 'https://source.unsplash.com/900x700/?customer,support'
};

const statsFallback = [
  { label: 'Members', value: 1200, icon: Users },
  { label: 'Products', value: 350, icon: Store },
  { label: 'Support', value: 24, icon: Headphones },
  { label: 'Reach', value: 18, icon: Globe2, suffix: '+' }
];

function resolveDestination(user) {
  if (canAccessAdminArea(user)) return '/admin';
  if (isSeller(user)) return '/seller';
  return '/auctions';
}

function MenuItem({ href, icon: Icon, label, onSelect }) {
  return (
    <Link
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
    </Link>
  );
}

function ActionLink({ href, primary = false, children }) {
  const className = primary
    ? 'inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#8b3dff,#32d17d)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(90,47,180,0.32)] transition hover:brightness-110'
    : 'inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-[rgba(45,47,56,0.92)] px-5 py-3 text-sm font-semibold text-[#f5f7fb] transition hover:border-white/20 hover:bg-[rgba(56,58,68,0.96)]';

  return <Link href={href} className={className}>{children}</Link>;
}

function SafeImage({ src, fallbackSrc, alt, className }) {
  const [imageSrc, setImageSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setImageSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (imageSrc !== fallbackSrc) setImageSrc(fallbackSrc);
      }}
    />
  );
}

function StatCard({ item }) {
  const Icon = item.icon;
  return (
    <article className="rounded-[22px] border border-white/10 bg-[#2b2d35] p-4 shadow-[0_16px_36px_rgba(0,0,0,0.18)]">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] bg-[rgba(139,61,255,0.14)] text-[#d8b4fe]">
        <Icon size={18} />
      </span>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#f5f7fb]">
        {Number(item.value || 0).toLocaleString()}{item.suffix || ''}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[#c0c7d4]">{item.label}</p>
    </article>
  );
}

function HighlightCard({ item }) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[#2b2d35] shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <div className="overflow-hidden rounded-[20px] p-3 pb-0">
        <SafeImage
          src={item.image}
          fallbackSrc={item.fallbackImage}
          alt={item.title}
          className="h-[180px] w-full rounded-[18px] object-cover"
        />
      </div>
      <div className="p-4 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a78bfa]">{item.kicker}</p>
        <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#f5f7fb]">{item.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#c0c7d4]">{item.body}</p>
        {item.href ? (
          <div className="mt-4">
            <Link href={item.href} className="inline-flex items-center gap-2 text-sm font-semibold text-[#f5f7fb]">
              <span>{item.cta || 'Explore'}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function PublicLandingPage() {
  const router = useRouter();
  const { token, hydrated, hydrate, clearSession } = useAuthStore();
  const visitorTrackedRef = useRef(false);
  const headerMenuRef = useRef(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) hydrate();
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
    if (currentUserQuery.data) router.replace(resolveDestination(currentUserQuery.data));
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
      if (!headerMenuRef.current?.contains(event.target)) setHeaderMenuOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [headerMenuOpen]);

  const data = landingQuery.data;
  const settings = data?.settings || {};
  const featuredItems = Array.isArray(data?.featuredItems) ? data.featuredItems : [];
  const detailItems = Array.isArray(data?.details) ? data.details : [];
  const stats = data?.stats || {};

  const heroImage = useMemo(() => {
    return settings.heroImageUrl || featuredItems[0]?.imageUrl || fallbackImages.ecommerce;
  }, [featuredItems, settings.heroImageUrl]);

  const statCards = useMemo(() => {
    return [
      { label: 'Members', value: stats.totalMembers || statsFallback[0].value, icon: Users },
      { label: 'Products', value: featuredItems.length || statsFallback[1].value, icon: Store },
      { label: 'Support', value: 24, icon: Headphones },
      { label: 'Reach', value: Array.isArray(data?.countries) ? data.countries.length : statsFallback[3].value, icon: Globe2, suffix: '+' }
    ];
  }, [data?.countries, featuredItems.length, stats.totalMembers]);

  const highlightCards = useMemo(() => {
    const used = new Set();
    const cards = [
      {
        kicker: 'Seller Tools',
        title: 'Seller tools that stay practical',
        body: 'Manage products, track activity, and grow your business from one clear dashboard.',
        href: '/register',
        cta: 'Start selling',
        image: detailItems[0]?.imageUrl,
        fallbackImage: fallbackImages.seller
      },
      {
        kicker: 'Auctions',
        title: 'Live auction experiences with clean flow',
        body: 'Follow active auctions, place bids, and explore a more engaging buying journey.',
        href: '/auctions',
        cta: 'Open auctions',
        image: featuredItems[1]?.imageUrl,
        fallbackImage: fallbackImages.auction
      },
      {
        kicker: 'Digital Growth',
        title: 'Rewards and digital opportunities in one place',
        body: 'Keep shopping, participation, and digital opportunity flows inside one modern platform.',
        href: '/register',
        cta: 'Create account',
        image: detailItems[1]?.imageUrl,
        fallbackImage: fallbackImages.digital
      }
    ];

    return cards.map((item, index) => {
      const candidate = item.image || item.fallbackImage;
      const image = used.has(candidate) ? Object.values(fallbackImages)[index % Object.values(fallbackImages).length] : candidate;
      used.add(image);
      return { ...item, image };
    });
  }, [detailItems, featuredItems]);

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
        @keyframes hopeMenuIn {
          0% { opacity: 0; transform: translateY(-6px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-[#8b3dff]/18 blur-3xl" />
        <div className="absolute right-[-8rem] top-40 h-80 w-80 rounded-full bg-[#32d17d]/14 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="sticky top-3 z-30 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(42,44,52,0.96),rgba(34,35,42,0.94))] px-3 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:top-5 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3 rounded-[22px] px-1 py-1.5">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,#2f3139,#24262d)] shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
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
                  <MenuItem href="#about" icon={Sparkles} label="About" onSelect={() => setHeaderMenuOpen(false)} />
                  <MenuItem href="/login" icon={ShieldCheck} label="Login" onSelect={() => setHeaderMenuOpen(false)} />
                  <MenuItem href="/register" icon={Users} label="Register" onSelect={() => setHeaderMenuOpen(false)} />
                  <MenuItem href={`mailto:${settings.footerContactEmail || 'support@example.com'}`} icon={Headphones} label="Contact Support" onSelect={() => setHeaderMenuOpen(false)} />
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section id="about" className="pt-6 sm:pt-8">
          <div className="grid gap-6 rounded-[34px] border border-white/10 bg-[rgba(43,45,53,0.96)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.24)] md:grid-cols-[1.05fr_0.95fr] md:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(32,33,39,0.88)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d3d9e5]">
                <Sparkles size={14} className="text-[#a78bfa]" />
                {settings.heroBadge || 'Hope International'}
              </div>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.06em] text-[#f5f7fb] sm:text-5xl">
                {settings.heroHeadline || 'A premium platform for shopping, auctions, and digital growth.'}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-8 text-[#c0c7d4]">
                {settings.heroSubheadline || 'Explore products, opportunities, and seller tools inside a clean mobile-first experience designed to stay practical and readable.'}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <ActionLink href="/login">Login</ActionLink>
                <ActionLink href="/register" primary>Create Account</ActionLink>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#2b2d35] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
              <SafeImage src={heroImage} fallbackSrc={fallbackImages.ecommerce} alt="Hope International hero visual" className="h-[220px] w-full object-cover md:h-full" />
            </div>
          </div>
        </section>

        <section className="pt-10">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statCards.map((item) => (
              <StatCard key={item.label} item={item} />
            ))}
          </div>
        </section>

        <section className="pt-10">
          <div className="mb-5 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d3d9e5]">Highlights</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#f5f7fb]">Featured opportunities built for clarity</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {highlightCards.map((item) => (
              <HighlightCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        <section className="pt-10 pb-8">
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(43,45,53,0.96),rgba(36,38,45,0.96))] p-5 shadow-[0_20px_48px_rgba(0,0,0,0.24)] md:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Get Started</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#f5f7fb]">Join Hope International with a cleaner way to explore and grow.</h2>
                <p className="mt-3 text-sm leading-7 text-[#c0c7d4]">Simple onboarding, readable sections, and one connected experience across products, auctions, and seller tools.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ActionLink href="#about">Learn More</ActionLink>
                <ActionLink href="/register" primary>Join Now</ActionLink>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
