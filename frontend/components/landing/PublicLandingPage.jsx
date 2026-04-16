'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Calendar,
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
  Wallet,
  X
} from 'lucide-react';
import Logo from '@/components/common/Logo';
import { ErrorState } from '@/components/ui/ErrorState';
import { getMe } from '@/lib/services/authService';
import { getPublicGallery, getPublicLandingPage, trackLandingVisit } from '@/lib/services/landingService';
import { useAuthStore } from '@/lib/store/authStore';
import { queryKeys } from '@/lib/query/queryKeys';
import { resolveMediaUrl } from '@/lib/utils/media';
import { getPostLoginRoute } from '@/lib/utils/postLoginRedirect';
import { clearProtectedQueries } from '@/lib/utils/logout';

const faqItems = [
  { question: 'What is Hope International?', answer: 'Hope International is a hybrid platform that combines network growth, ecommerce participation, auction activity, and wallet tools in one mobile-first experience.' },
  { question: 'How do I start earning?', answer: 'Join through a valid referral link, complete your setup, choose your placement, and begin building activity through products, referrals, and platform participation.' },
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
  { question: 'How do I register today?', answer: 'Ask an existing member for a valid referral link to begin onboarding into the platform.' }
];

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

function FeatureCard({ icon: Icon, title, description, imageUrl }) {
  const resolvedImageUrl = resolveMediaUrl(imageUrl);

  return (
    <article className="relative overflow-hidden rounded-[22px] border border-white/8 bg-[#1a1f2e] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
      {resolvedImageUrl ? <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${resolvedImageUrl})` }} /> : null}
      {resolvedImageUrl ? <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.28),rgba(17,24,39,0.88))]" /> : null}
      <div className="relative">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(34,197,94,0.16))] text-white">
          <Icon size={20} />
        </span>
        <h3 className="mt-4 text-[18px] font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#9ca3af]">{description}</p>
      </div>
    </article>
  );
}

function StepCard({ step, icon: Icon, title, description, imageUrl }) {
  const resolvedImageUrl = resolveMediaUrl(imageUrl);

  return (
    <article className="relative overflow-hidden rounded-[22px] border border-white/8 bg-[#151b2b] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.25)]">
      {resolvedImageUrl ? <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${resolvedImageUrl})` }} /> : null}
      {resolvedImageUrl ? <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(15,23,42,0.9))]" /> : null}
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(34,197,94,0.16))] text-white">
            <Icon size={18} />
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-[#c4b5fd]">Step {step}</span>
        </div>
        <h3 className="mt-4 text-[17px] font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#9ca3af]">{description}</p>
      </div>
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

function ReasonCard({ title, description, imageUrl }) {
  const resolvedImageUrl = resolveMediaUrl(imageUrl);

  return (
    <article className="relative overflow-hidden rounded-[20px] border border-white/8 bg-[#161d2e] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
      {resolvedImageUrl ? <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${resolvedImageUrl})` }} /> : null}
      {resolvedImageUrl ? <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.22),rgba(17,24,39,0.9))]" /> : null}
      <div className="relative">
        <h3 className="text-[16px] font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#9ca3af]">{description}</p>
      </div>
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

function FeaturedProductCard({ title, category, price, description, image, imageAlt, icon: Icon }) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedImageUrl = resolveMediaUrl(image);

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedImageUrl]);

  return (
    <article className="overflow-hidden rounded-[24px] border border-white/8 bg-[#151b2b] shadow-[0_18px_40px_rgba(0,0,0,0.32)]">
      <div className="relative h-52 overflow-hidden border-b border-white/8 bg-[linear-gradient(135deg,#1c2540,#121827)]">
        {!imageFailed && resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt={imageAlt || title}
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
  const queryClient = useQueryClient();
  const { token, hydrated, hydrate, clearSession } = useAuthStore();
  const visitorTrackedRef = useRef(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedGalleryItem, setSelectedGalleryItem] = useState(null);
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

  const galleryQuery = useQuery({
    queryKey: queryKeys.publicGallery,
    queryFn: getPublicGallery,
    enabled: galleryOpen
  });

  const trackVisitMutation = useMutation({ mutationFn: trackLandingVisit });

  useEffect(() => {
    if (!hydrated || !token) return;
    if (currentUserQuery.data) router.replace(getPostLoginRoute(currentUserQuery.data));
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
  const media = data?.media || {};
  const getMedia = (slotKey) => media?.[slotKey] || {};
  const headerBelowImage = getMedia('header_below_image');
  const headerBelowImageUrl = resolveMediaUrl(headerBelowImage.imageUrl);
  const profileHref = currentUserQuery.data ? getPostLoginRoute(currentUserQuery.data) : '/dashboard';

  const featureCards = useMemo(() => ([
    {
      icon: Network,
      title: 'Binary Income System',
      description: 'Build left and right team volume with a structure designed for modern network growth and long-term engagement.',
      imageUrl: getMedia('feature_image_1').imageUrl
    },
    {
      icon: ShoppingBag,
      title: 'E-commerce Marketplace',
      description: 'Shop from a premium catalog, discover featured products, and keep your product journey connected to your platform activity.',
      imageUrl: getMedia('feature_image_2').imageUrl
    },
    {
      icon: Trophy,
      title: 'Auction & Rewards',
      description: 'Join interactive auction experiences, unlock result-driven excitement, and follow live reward opportunities inside one app.',
      imageUrl: getMedia('feature_image_3').imageUrl
    },
    {
      icon: Wallet,
      title: 'Wallet & Instant Withdrawals',
      description: 'Track balances, manage transactions, review BTCT activity, and use wallet tools built for fast everyday access.',
      imageUrl: getMedia('feature_image_4').imageUrl
    }
  ]), [data]);

  const steps = useMemo(() => ([
    {
      step: 1,
      icon: Users,
      title: 'Register Account',
      description: 'Join through a valid referral link from an existing member, then unlock access to products, teams, and wallet tools.',
      imageUrl: getMedia('step_image_1').imageUrl
    },
    {
      step: 2,
      icon: Compass,
      title: 'Choose Placement',
      description: 'Select your left or right placement strategy and start building your binary structure with intention.',
      imageUrl: getMedia('step_image_2').imageUrl
    },
    {
      step: 3,
      icon: Globe2,
      title: 'Build Team',
      description: 'Grow globally by sharing products, onboarding members, and expanding your network through a simple mobile-first flow.',
      imageUrl: getMedia('step_image_3').imageUrl
    },
    {
      step: 4,
      icon: HandCoins,
      title: 'Earn Matching Income',
      description: 'Turn structured activity into direct and matching opportunities as your team and platform engagement scale up.',
      imageUrl: getMedia('step_image_4').imageUrl
    }
  ]), [data]);

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
      value: '20%',
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
      description: 'Modern account flows, protected wallet access, and structured user surfaces help keep the experience reliable.',
      imageUrl: getMedia('reason_image_1').imageUrl
    },
    {
      title: 'Real Products',
      description: 'Marketplace participation is backed by real catalog experiences instead of abstract dashboards with no commerce layer.',
      imageUrl: getMedia('reason_image_2').imageUrl
    },
    {
      title: 'Smart Earnings',
      description: 'Direct, matching, auction, and wallet-connected opportunities work together inside one connected platform experience.',
      imageUrl: getMedia('reason_image_3').imageUrl
    },
    {
      title: 'Global Growth',
      description: 'Mobile-first onboarding and a globally oriented structure make it easier to grow beyond a single local market.',
      imageUrl: getMedia('reason_image_4').imageUrl
    }
  ]), [data]);

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
      image: getMedia('product_image_1').imageUrl,
      imageAlt: getMedia('product_image_1').altText,
      icon: Sparkles
    },
    {
      title: 'Emerald Stone Collection',
      category: 'Featured product',
      price: '$250',
      description: 'Luxury-style merchandising product for premium presentation and value perception.',
      image: getMedia('product_image_2').imageUrl,
      imageAlt: getMedia('product_image_2').altText,
      icon: Gem
    },
    {
      title: 'Digital Growth Package',
      category: 'Digital service',
      price: '$60',
      description: 'Social growth and promotion-oriented digital package for visibility support.',
      image: getMedia('product_image_3').imageUrl,
      imageAlt: getMedia('product_image_3').altText,
      icon: Globe2
    },
    {
      title: 'Auction Mystery Reward Box',
      category: 'Auction product',
      price: '$20 Entry',
      description: 'Interactive auction reward listing for users who want live engagement and special prize access.',
      image: getMedia('product_image_4').imageUrl,
      imageAlt: getMedia('product_image_4').altText,
      icon: Trophy
    }
  ]), [data]);

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
              <Logo size={38} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a78bfa]">Hope</p>
                <p className="truncate text-sm font-semibold text-white">International</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/10 bg-[#151c2d] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition hover:border-white/15 hover:bg-[#1b2337] hover:shadow-[0_14px_30px_rgba(0,0,0,0.3)] active:scale-[0.98]"
                  aria-label="Open landing options"
                >
                  <Menu size={18} />
                </button>

                <div
                  className={`absolute right-0 top-[calc(100%+0.75rem)] z-40 w-60 origin-top-right overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(14,20,33,0.96)] p-2 text-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl transition duration-200 ${
                    moreMenuOpen ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setGalleryOpen(true);
                      setMoreMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-[14px] px-3 py-3 text-left text-sm text-white transition hover:bg-white/8"
                  >
                    <span>Gallery</span>
                    <span className="rounded-full bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">Open</span>
                  </button>

                  <Link
                    href="#features"
                    className="flex w-full items-center justify-between rounded-[14px] px-3 py-3 text-sm text-white transition hover:bg-white/8"
                    onClick={() => setMoreMenuOpen(false)}
                  >
                    <span>Explore Platform</span>
                    <span className="text-xs text-[#9ca3af]">Section</span>
                  </Link>

                  {!token ? (
                    <>
                      <Link
                        href="/login"
                        className="flex w-full items-center justify-between rounded-[14px] px-3 py-3 text-sm text-white transition hover:bg-white/8"
                        onClick={() => setMoreMenuOpen(false)}
                      >
                        <span>Login</span>
                        <span className="text-xs text-[#9ca3af]">Account</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href={profileHref}
                        className="flex w-full items-center justify-between rounded-[14px] px-3 py-3 text-sm text-white transition hover:bg-white/8"
                        onClick={() => setMoreMenuOpen(false)}
                      >
                        <span>Profile</span>
                        <span className="text-xs text-[#9ca3af]">Workspace</span>
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          clearSession({ loggingOut: true });
                          await clearProtectedQueries(queryClient);
                          setMoreMenuOpen(false);
                          router.replace('/login');
                        }}
                        className="flex w-full items-center justify-between rounded-[14px] px-3 py-3 text-left text-sm text-white transition hover:bg-white/8"
                      >
                        <span>Logout</span>
                        <span className="text-xs text-[#9ca3af]">Secure exit</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <SecondaryButton href="#features">Explore Platform</SecondaryButton>
              <PrimaryButton href="/login">Login</PrimaryButton>
            </div>
          </div>
        </header>

        {headerBelowImageUrl ? (
          <section className="pt-6">
            <div className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(20,28,45,0.94),rgba(11,15,26,0.9))] shadow-[0_22px_60px_rgba(0,0,0,0.34)]">
              <div
                className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.02]"
                style={{ backgroundImage: `url(${headerBelowImageUrl})` }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,20,0.08),rgba(8,12,20,0.3))]" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
              <img
                src={headerBelowImageUrl}
                alt={headerBelowImage.altText || 'Header banner'}
                className="h-40 w-full object-cover opacity-0 sm:h-52 lg:h-64"
              />
            </div>
          </section>
        ) : null}

        <section className="pt-8">
          <div className="grid gap-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,39,0.95),rgba(13,18,30,0.95))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.35)] md:grid-cols-[1.1fr_0.9fr] md:p-8">
            <div>
              <h1 className="text-4xl font-semibold leading-tight tracking-[-0.06em] text-white sm:text-5xl">
                Build Your Income With Hope International
              </h1>
              <p className="mt-4 max-w-xl text-base leading-8 text-[#9ca3af]">
                Earn, shop, and grow your network with a powerful binary system and premium marketplace.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <PrimaryButton href="/login">
                  <span>Login</span>
                  <ArrowRight size={15} />
                </PrimaryButton>
                <SecondaryButton href="#features">
                  <span>Explore Platform</span>
                </SecondaryButton>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatPill title="Users" value="1M+ Users" />
                <StatPill title="Reach" value="Global Platform" />
                <StatPill title="Trust" value="Secure System" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,#151b2b,#101726)] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.3)]">
              {resolveMediaUrl(getMedia('hero_image').imageUrl) ? (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-20"
                    style={{ backgroundImage: `url(${resolveMediaUrl(getMedia('hero_image').imageUrl)})` }}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,23,38,0.25),rgba(16,23,38,0.92))]" />
                </>
              ) : null}
              <div className="relative grid gap-3">
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
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(34,197,94,0.12))] p-6 shadow-[0_20px_52px_rgba(0,0,0,0.3)]">
            {resolveMediaUrl(getMedia('promo_banner_image').imageUrl) ? (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-20"
                  style={{ backgroundImage: `url(${resolveMediaUrl(getMedia('promo_banner_image').imageUrl)})` }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(56,189,248,0.16),rgba(17,24,39,0.7))]" />
              </>
            ) : null}
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d8b4fe]">Call To Action</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">Start Your Income Journey Today</h2>
                <p className="mt-3 text-sm leading-7 text-[#d1d5db]">Join Hope International and step into a premium mobile-first ecosystem for earnings, shopping, and network growth.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {galleryOpen ? (
        <div className="fixed inset-0 z-[80] px-3 py-4 sm:px-6 sm:py-6">
          <button
            type="button"
            aria-label="Close gallery"
            className="absolute inset-0 bg-[rgba(3,7,18,0.78)] backdrop-blur-sm"
            onClick={() => {
              setGalleryOpen(false);
              setSelectedGalleryItem(null);
            }}
          />

          <div className="relative mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.98),rgba(14,20,33,0.97))] shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c4b5fd]">Gallery</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">Event photos and media moments</h2>
                <p className="mt-2 text-sm text-[#9ca3af]">Admin-uploaded photos appear here only when visitors open Gallery from the landing menu.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGalleryOpen(false);
                  setSelectedGalleryItem(null);
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
                aria-label="Close gallery modal"
              >
                <X size={18} />
              </button>
            </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                {galleryQuery.isLoading ? null : galleryQuery.isError ? (
                  <div className="rounded-[24px] border border-white/10 bg-white/5 px-6 py-14 text-center">
                    <p className="text-base font-semibold text-white">Unable to load gallery photos.</p>
                    <button
                    type="button"
                    onClick={() => galleryQuery.refetch()}
                    className="mt-4 rounded-[16px] bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : Array.isArray(galleryQuery.data) && galleryQuery.data.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {galleryQuery.data.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedGalleryItem(item)}
                      className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#121927] text-left shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition hover:-translate-y-1 hover:border-white/16"
                    >
                      <div className="relative h-56 overflow-hidden bg-[#0f172a]">
                        <img
                          src={resolveMediaUrl(item.imageUrl)}
                          alt={item.title || 'Gallery photo'}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.58))]" />
                      </div>
                      <div className="space-y-2 p-4">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a78bfa]">
                          <Calendar size={12} />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <h3 className="text-lg font-semibold text-white">{item.title || 'Event photo'}</h3>
                        {item.caption ? <p className="line-clamp-2 text-sm leading-6 text-[#9ca3af]">{item.caption}</p> : <p className="text-sm text-[#6b7280]">Tap to enlarge</p>}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 px-6 py-14 text-center">
                  <p className="text-lg font-semibold text-white">No gallery photos yet</p>
                </div>
              )}
            </div>
          </div>

          {selectedGalleryItem ? (
            <div className="absolute inset-0 z-[81] flex items-center justify-center px-4 py-8">
              <button
                type="button"
                aria-label="Close enlarged gallery image"
                className="absolute inset-0 bg-[rgba(3,7,18,0.8)]"
                onClick={() => setSelectedGalleryItem(null)}
              />
              <div className="relative max-h-full w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0f172a] shadow-[0_28px_90px_rgba(0,0,0,0.46)]">
                <img
                  src={resolveMediaUrl(selectedGalleryItem.imageUrl)}
                  alt={selectedGalleryItem.title || 'Gallery photo'}
                  className="max-h-[72vh] w-full object-contain bg-[#020617]"
                />
                <div className="space-y-2 border-t border-white/10 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">{selectedGalleryItem.title || 'Event photo'}</h3>
                    <button type="button" onClick={() => setSelectedGalleryItem(null)} className="rounded-full border border-white/10 p-2 text-white">
                      <X size={16} />
                    </button>
                  </div>
                  {selectedGalleryItem.caption ? <p className="text-sm leading-6 text-[#9ca3af]">{selectedGalleryItem.caption}</p> : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
