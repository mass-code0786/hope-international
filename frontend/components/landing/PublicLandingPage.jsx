'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ChevronDown,
  Compass,
  Gem,
  Globe2,
  HandCoins,
  Landmark,
  Menu,
  Network,
  ShieldCheck,
  ShoppingBag,
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

const faqItems = [
  { question: 'What is Hope International?', answer: 'Hope International is a hybrid platform that combines network growth, ecommerce participation, auction activity, and wallet tools in one mobile-first experience.' },
  { question: 'How do I start earning?', answer: 'Create an account, complete your setup, choose your placement, and begin building activity through products, referrals, and platform participation.' },
  { question: 'What is the binary system?', answer: 'The binary system organizes your team into left and right legs so volume and team growth can contribute to matching and binary-based earning opportunities.' },
  { question: 'Do I need to buy products to use the platform?', answer: 'You can explore the platform freely, but product and activity participation can unlock more of the available earning and engagement flows.' },
  { question: 'How does direct income work?', answer: 'Direct income is paid when personally referred users complete qualifying activity, based on the current compensation rules configured in the platform.' },
  { question: 'How does matching income work?', answer: 'Matching income rewards balanced and active network performance across your structure according to the configured matching plan.' },
  { question: 'Is there a weekly settlement cycle?', answer: 'Yes. The platform includes weekly settlement-based flows where qualifying activity is processed according to the current compensation cycle.' },
  { question: 'Can I use the marketplace without building a team?', answer: 'Yes. The marketplace and auction surfaces are designed to work as usable product experiences even if you are not focused on referral growth.' },
  { question: 'What makes the auction module different?', answer: 'The auction module combines fixed-entry participation, live updates, leaderboard-style visibility, and post-result reveal experiences.' },
  { question: 'How are wallet balances managed?', answer: 'The app separates wallet experiences into dedicated flows for deposits, withdrawals, BTCT activity, and income-related balances where applicable.' },
  { question: 'How fast are withdrawals?', answer: 'Withdrawal timing depends on the active operational and approval flow, but the wallet UI is built to make request and history visibility simple.' },
  { question: 'Is the platform secure?', answer: 'Security-focused account controls, structured wallet flows, and protected route access are part of the platform design.' },
  { question: 'Can I become a seller?', answer: 'Yes. Eligible users can apply for seller access and manage product listings through the seller console.' },
  { question: 'Is Hope International available globally?', answer: 'The platform is designed for a global audience, with mobile-friendly experiences and broad access to core product surfaces.' },
  { question: 'Can I track my team growth?', answer: 'Yes. Team, placement, and activity visibility are part of the user experience through dedicated team and profile tools.' },
  { question: 'What kind of products are sold?', answer: 'The marketplace is built for real products and structured listings, with room for featured catalog experiences and seller-managed inventory.' },
  { question: 'Do I need technical knowledge?', answer: 'No. The experience is designed to be straightforward for everyday users, with guided flows across registration, wallet actions, and participation.' },
  { question: 'Can I use the platform on mobile?', answer: 'Yes. The landing page and core user flows are designed mobile-first so the main experience stays usable on phones and tablets.' },
  { question: 'How do rewards work after auctions?', answer: 'Auction outcomes and related reward logic depend on the configured backend rules for winners, participation, and any compensation flow tied to the auction.' },
  { question: 'How do I register today?', answer: 'Use the Register button from the hero or CTA section to create your account and begin onboarding into the platform.' }
];

function resolveDestination(user) {
  if (canAccessAdminArea(user)) return '/admin';
  if (isSeller(user)) return '/seller';
  return '/auctions';
}

function PrimaryButton({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.35)] transition hover:brightness-110"
    >
      {children}
    </Link>
  );
}

function SecondaryButton({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
    >
      {children}
    </Link>
  );
}

function StatPill({ title, value }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-[#131a2b] px-4 py-3 shadow-[0_10px_26px_rgba(0,0,0,0.25)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">{title}</p>
      <p className="mt-1 text-[16px] font-semibold text-white">{value}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <article className="rounded-[22px] border border-white/8 bg-[#1a1f2e] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(34,197,94,0.16))] text-white">
        <Icon size={20} />
      </span>
      <h3 className="mt-4 text-[18px] font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#9ca3af]">{description}</p>
    </article>
  );
}

function StepCard({ step, icon: Icon, title, description }) {
  return (
    <article className="rounded-[22px] border border-white/8 bg-[#151b2b] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(34,197,94,0.16))] text-white">
          <Icon size={18} />
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-[#c4b5fd]">Step {step}</span>
      </div>
      <h3 className="mt-4 text-[17px] font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#9ca3af]">{description}</p>
    </article>
  );
}

function IncomeCard({ title, value, description, icon: Icon }) {
  return (
    <article className="rounded-[22px] border border-white/8 bg-[#121827] p-4 shadow-[0_12px_26px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,rgba(124,58,237,0.2),rgba(34,197,94,0.14))] text-white">
          <Icon size={18} />
        </span>
        <span className="text-[18px] font-semibold text-[#22c55e]">{value}</span>
      </div>
      <h3 className="mt-4 text-[17px] font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#9ca3af]">{description}</p>
    </article>
  );
}

function ReasonCard({ title, description }) {
  return (
    <article className="rounded-[20px] border border-white/8 bg-[#161d2e] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
      <h3 className="text-[16px] font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#9ca3af]">{description}</p>
    </article>
  );
}

function ProductChip({ label }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#d1d5db]">
      {label}
    </span>
  );
}

function FeaturedProductCard({ title, category, price, description, image, icon: Icon }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="overflow-hidden rounded-[24px] border border-white/8 bg-[#151b2b] shadow-[0_18px_40px_rgba(0,0,0,0.32)]">
      <div className="relative h-52 overflow-hidden border-b border-white/8 bg-[linear-gradient(135deg,#1c2540,#121827)]">
        {!imageFailed ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : null}
        <div className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(11,15,26,0.02),rgba(11,15,26,0.82))] ${imageFailed ? 'flex items-center justify-center' : ''}`}>
          {imageFailed ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(34,197,94,0.16))] text-white">
              <Icon size={26} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-[#c4b5fd]">
            {category}
          </span>
          <span className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-3 py-1 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(124,58,237,0.28)]">
            {price}
          </span>
        </div>
        <h3 className="mt-4 text-[18px] font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#9ca3af]">{description}</p>
      </div>
    </article>
  );
}

function FaqItem({ item, open, onToggle }) {
  return (
    <article className="rounded-[18px] border border-white/8 bg-[#141b2c] shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-white">{item.question}</span>
        <ChevronDown size={18} className={`shrink-0 text-[#9ca3af] transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="border-t border-white/6 px-4 py-3">
          <p className="text-sm leading-6 text-[#9ca3af]">{item.answer}</p>
        </div>
      ) : null}
    </article>
  );
}

export default function PublicLandingPage() {
  const router = useRouter();
  const { token, hydrated, hydrate, clearSession } = useAuthStore();
  const visitorTrackedRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

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

  const data = landingQuery.data;

  const featureCards = useMemo(() => ([
    {
      icon: Network,
      title: 'Binary Income System',
      description: 'Build left and right team volume with a structure designed for modern network growth and long-term engagement.'
    },
    {
      icon: ShoppingBag,
      title: 'E-commerce Marketplace',
      description: 'Shop from a premium catalog, discover featured products, and keep your product journey connected to your platform activity.'
    },
    {
      icon: Trophy,
      title: 'Auction & Rewards',
      description: 'Join interactive auction experiences, unlock result-driven excitement, and follow live reward opportunities inside one app.'
    },
    {
      icon: Wallet,
      title: 'Wallet & Instant Withdrawals',
      description: 'Track balances, manage transactions, review BTCT activity, and use wallet tools built for fast everyday access.'
    }
  ]), []);

  const steps = useMemo(() => ([
    {
      step: 1,
      icon: Users,
      title: 'Register Account',
      description: 'Create your Hope International account in minutes and unlock access to products, teams, and wallet tools.'
    },
    {
      step: 2,
      icon: Compass,
      title: 'Choose Placement',
      description: 'Select your left or right placement strategy and start building your binary structure with intention.'
    },
    {
      step: 3,
      icon: Globe2,
      title: 'Build Team',
      description: 'Grow globally by sharing products, onboarding members, and expanding your network through a simple mobile-first flow.'
    },
    {
      step: 4,
      icon: HandCoins,
      title: 'Earn Matching Income',
      description: 'Turn structured activity into direct and matching opportunities as your team and platform engagement scale up.'
    }
  ]), []);

  const incomeCards = useMemo(() => ([
    {
      icon: Sparkles,
      title: 'Direct Income',
      value: '5%',
      description: 'Earn direct rewards from personally introduced users when qualifying activity is completed.'
    },
    {
      icon: Network,
      title: 'Matching Income',
      value: '10%',
      description: 'Benefit from matching structure performance as both legs of your team continue to grow.'
    },
    {
      icon: Gem,
      title: 'Binary System',
      value: '2 Legs',
      description: 'A clean left-right team model helps you scale with clarity while staying aligned to the platform plan.'
    },
    {
      icon: Landmark,
      title: 'Weekly Settlement',
      value: 'Weekly',
      description: 'Stay synced with recurring settlement logic designed to keep performance and payout tracking transparent.'
    }
  ]), []);

  const reasons = useMemo(() => ([
    {
      title: 'Secure Platform',
      description: 'Modern account flows, protected wallet access, and structured user surfaces help keep the experience reliable.'
    },
    {
      title: 'Real Products',
      description: 'Marketplace participation is backed by real catalog experiences instead of abstract dashboards with no commerce layer.'
    },
    {
      title: 'Smart Earnings',
      description: 'Direct, matching, auction, and wallet-connected opportunities work together inside one connected platform experience.'
    },
    {
      title: 'Global Growth',
      description: 'Mobile-first onboarding and a globally oriented structure make it easier to grow beyond a single local market.'
    }
  ]), []);

  const productTags = useMemo(() => ([
    'Activation packs',
    'Fashion products',
    'Digital services',
    'Gift items',
    'Auction rewards',
    'Growth packages'
  ]), []);

  const featuredProducts = useMemo(() => ([
    {
      title: 'Hope Elite Starter Pack',
      category: 'Activation product',
      price: '$100',
      description: 'Premium onboarding bundle for new members who want a fast and structured start.',
      image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80',
      icon: Sparkles
    },
    {
      title: 'Emerald Stone Collection',
      category: 'Featured product',
      price: '$250',
      description: 'Luxury-style merchandising product for premium presentation and value perception.',
      image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1200&q=80',
      icon: Gem
    },
    {
      title: 'Digital Growth Package',
      category: 'Digital service',
      price: '$60',
      description: 'Social growth and promotion-oriented digital package for visibility support.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
      icon: Globe2
    },
    {
      title: 'Auction Mystery Reward Box',
      category: 'Auction product',
      price: '$20 Entry',
      description: 'Interactive auction reward listing for users who want live engagement and special prize access.',
      image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80',
      icon: Trophy
    }
  ]), []);

  if (hydrated && token && currentUserQuery.isLoading) {
    return <div className="min-h-screen bg-[#0b0f1a] px-6 py-16 text-center text-sm text-[#9ca3af]">Redirecting to your Hope workspace...</div>;
  }

  if (landingQuery.isLoading) {
    return <div className="min-h-screen bg-[#0b0f1a] px-6 py-16 text-center text-sm text-[#9ca3af]">Loading Hope International...</div>;
  }

  if (landingQuery.isError || !data) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] px-4 py-10">
        <ErrorState message="Unable to load the Hope International landing page." onRetry={landingQuery.refetch} />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#0b0f1a,#111827)] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-10 h-80 w-80 rounded-full bg-[#7c3aed]/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-28 h-80 w-80 rounded-full bg-[#22c55e]/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#0ea5e9]/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="sticky top-3 z-30 rounded-[22px] border border-white/10 bg-[rgba(12,17,29,0.88)] px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-[#151c2d]">
                <Logo size={30} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Hope</p>
                <p className="truncate text-sm font-semibold text-white">International</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#151c2d] text-white md:hidden"
              aria-label="Toggle landing menu"
            >
              <Menu size={18} />
            </button>

            <div className="hidden items-center gap-3 md:flex">
              <SecondaryButton href="#features">Explore Platform</SecondaryButton>
              <PrimaryButton href="/register">Start Now</PrimaryButton>
            </div>
          </div>

          {menuOpen ? (
            <div className="mt-3 grid gap-2 border-t border-white/8 pt-3 md:hidden">
              <SecondaryButton href="#features">Explore Platform</SecondaryButton>
              <PrimaryButton href="/register">Start Now</PrimaryButton>
            </div>
          ) : null}
        </header>

        <section className="pt-8">
          <div className="grid gap-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,39,0.95),rgba(13,18,30,0.95))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.35)] md:grid-cols-[1.1fr_0.9fr] md:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c4b5fd]">
                <Sparkles size={13} />
                Premium growth platform
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.06em] text-white sm:text-5xl">
                Build Your Income With Hope International
              </h1>
              <p className="mt-4 max-w-xl text-base leading-8 text-[#9ca3af]">
                Earn, shop, and grow your network with a powerful binary system and premium marketplace.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton href="/register">
                  <span>Start Now</span>
                  <ArrowRight size={15} />
                </PrimaryButton>
                <SecondaryButton href="#features">
                  <span>Explore Platform</span>
                </SecondaryButton>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatPill title="Users" value="10,000+ Users" />
                <StatPill title="Reach" value="Global Platform" />
                <StatPill title="Trust" value="Secure System" />
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,#151b2b,#101726)] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.3)]">
              <div className="grid gap-3">
                <div className="rounded-[22px] border border-white/8 bg-[#1a1f2e] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Growth Engine</p>
                  <h3 className="mt-2 text-[20px] font-semibold text-white">Crypto-style performance meets marketplace conversion</h3>
                  <p className="mt-2 text-sm leading-6 text-[#9ca3af]">Designed for users who want a premium app feel across earnings, products, auctions, and wallet tools.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] border border-white/8 bg-[#131a2b] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Marketplace</p>
                    <p className="mt-2 text-[18px] font-semibold text-white">Premium Products</p>
                  </div>
                  <div className="rounded-[20px] border border-white/8 bg-[#131a2b] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Earnings</p>
                    <p className="mt-2 text-[18px] font-semibold text-white">Binary + Matching</p>
                  </div>
                  <div className="rounded-[20px] border border-white/8 bg-[#131a2b] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Auctions</p>
                    <p className="mt-2 text-[18px] font-semibold text-white">Reward Driven</p>
                  </div>
                  <div className="rounded-[20px] border border-white/8 bg-[#131a2b] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Wallet</p>
                    <p className="mt-2 text-[18px] font-semibold text-white">Fast Access</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="pt-12">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">Features</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">One premium ecosystem for income, commerce, and network growth</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {featureCards.map((item) => <FeatureCard key={item.title} {...item} />)}
          </div>
        </section>

        <section className="pt-12">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">How It Works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Start simple, scale smart</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {steps.map((item) => <StepCard key={item.step} {...item} />)}
          </div>
        </section>

        <section className="pt-12">
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#131a2b,#0f1625)] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.32)] md:p-7">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">Income System</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Built for clear earning paths</h2>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {incomeCards.map((item) => <IncomeCard key={item.title} {...item} />)}
            </div>
          </div>
        </section>

        <section className="pt-12">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">Why Choose Us</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">A cleaner path to global digital growth</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {reasons.map((item) => <ReasonCard key={item.title} {...item} />)}
          </div>
        </section>

        <section className="pt-12">
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#131a2b,#101726)] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.32)] md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">Featured products</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Products for shopping, activation, digital growth, and auctions</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#9ca3af]">
                  Show visitors that Hope International includes physical products, activation bundles, digital service products, and auction-linked offers inside one ecosystem.
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.14),rgba(34,197,94,0.08))] px-4 py-3 text-sm font-semibold text-white">
                Commerce + rewards + activation in one platform
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {productTags.map((tag) => <ProductChip key={tag} label={tag} />)}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featuredProducts.map((item) => <FeaturedProductCard key={item.title} {...item} />)}
            </div>
          </div>
        </section>

        <section className="pt-12">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">FAQ</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Everything users ask before they join</h2>
          </div>
          <div className="mt-6 grid gap-3">
            {faqItems.map((item, index) => (
              <FaqItem
                key={item.question}
                item={item}
                open={openFaq === index}
                onToggle={() => setOpenFaq((current) => current === index ? -1 : index)}
              />
            ))}
          </div>
        </section>

        <section className="pb-10 pt-12">
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(34,197,94,0.12))] p-6 shadow-[0_20px_52px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d8b4fe]">Call To Action</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Start Your Income Journey Today</h2>
                <p className="mt-3 text-sm leading-7 text-[#d1d5db]">Join Hope International and step into a premium mobile-first ecosystem for earnings, shopping, and network growth.</p>
              </div>
              <PrimaryButton href="/register">Register Now</PrimaryButton>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
