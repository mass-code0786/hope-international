'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Baby,
  Bell,
  ChevronRight,
  Gavel,
  HeartPulse,
  PackagePlus,
  Plus,
  Search,
  Shirt,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Store,
  Trophy,
  UtensilsCrossed
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ErrorState } from '@/components/ui/ErrorState';
import { DashboardSkeleton } from '@/components/ui/PageSkeletons';
import { EmptyState } from '@/components/ui/EmptyState';
import { getMe } from '@/lib/services/authService';
import { getHomepageBanners } from '@/lib/services/bannersService';
import { createOrder } from '@/lib/services/ordersService';
import { getAuctions } from '@/lib/services/auctionsService';
import { getWallet } from '@/lib/services/walletService';
import { useProducts } from '@/hooks/useProducts';
import { queryKeys } from '@/lib/query/queryKeys';
import { addToCart, subscribeCart } from '@/lib/utils/cart';
import { currency } from '@/lib/utils/format';
import { getProductPricing } from '@/lib/utils/pricing';
import { hasSufficientWalletBalance } from '@/lib/utils/wallet';

const fallbackSlides = [
  {
    id: 'home-fallback-1',
    title: 'Fresh groceries and essentials',
    subtitle: 'Daily offers picked for your account.',
    ctaText: 'Shop now',
    targetLink: '/shop',
    theme: 'from-[#fef3c7] via-[#fff7ed] to-[#ffffff]'
  },
  {
    id: 'home-fallback-2',
    title: 'Auctions worth watching',
    subtitle: 'Browse live and upcoming entries from home.',
    ctaText: 'Open auctions',
    targetLink: '/auctions',
    theme: 'from-[#dbeafe] via-[#eff6ff] to-[#ffffff]'
  }
];

const homeActions = [
  { label: 'Shop', href: '/shop', icon: Store, tint: 'bg-[#eff6ff] text-[#2563eb]' },
  { label: 'Grocery', href: '/shop', icon: ShoppingBasket, tint: 'bg-[#ecfdf3] text-[#15803d]' },
  { label: 'Health', href: '/shop', icon: HeartPulse, tint: 'bg-[#fff1f2] text-[#e11d48]' },
  { label: 'Fashion', href: '/shop', icon: Shirt, tint: 'bg-[#f5f3ff] text-[#7c3aed]' },
  { label: 'Food', href: '/shop', icon: UtensilsCrossed, tint: 'bg-[#fff7ed] text-[#ea580c]' },
  { label: 'Kids', href: '/shop', icon: Baby, tint: 'bg-[#fdf2f8] text-[#db2777]' },
  { label: 'Sports', href: '/shop', icon: Trophy, tint: 'bg-[#ecfeff] text-[#0891b2]' },
  { label: 'Services', href: '/support', icon: PackagePlus, tint: 'bg-[#f8fafc] text-[#475569]' },
  { label: 'Auctions', href: '/auctions', icon: Gavel, tint: 'bg-[#fef3c7] text-[#b45309]', featured: true }
];

function resolveBannerTarget(targetLink) {
  if (!targetLink) return '/shop';
  if (targetLink.startsWith('http://') || targetLink.startsWith('https://')) return targetLink;
  if (targetLink.startsWith('/')) return targetLink;
  return `/${targetLink}`;
}

function buildLocationLabel(user) {
  const pieces = [user?.city, user?.state, user?.country].filter(Boolean);
  if (pieces.length) return pieces.join(', ');
  return 'Set your delivery area';
}

function buildLocationDetail(user) {
  const address = [user?.address_line1, user?.address_line2].filter(Boolean).join(', ').trim();
  if (address) return address;
  if (user?.mobile_number) return [user?.country_code, user?.mobile_number].filter(Boolean).join(' ');
  return 'Location details will appear here';
}

function getProductCover(product) {
  return product?.image_url || product?.gallery?.[0] || '';
}

function getProductMeta(product) {
  return product?.seller_name || product?.store_name || product?.category || 'Hope Store';
}

function getActionHref(action) {
  if (action.label === 'Auctions') return '/auctions';
  return action.href;
}

function HomeBannerCard({ banner }) {
  const target = resolveBannerTarget(banner.targetLink);
  const content = (
    <article className={`relative h-[168px] overflow-hidden rounded-[20px] border border-slate-200 bg-gradient-to-r ${banner.theme || 'from-[#e2e8f0] to-white'} p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]`}>
      <div className="relative z-10 max-w-[72%]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Hope Marketplace</p>
        <h2 className="mt-2 text-[18px] font-semibold leading-5 text-slate-900">{banner.title}</h2>
        <p className="mt-2 line-clamp-2 text-[12px] leading-4 text-slate-600">{banner.subtitle || 'Curated picks for your account.'}</p>
        <span className="mt-4 inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white">
          {banner.ctaText || 'Explore'}
        </span>
      </div>
      <div className="absolute -right-7 bottom-0 h-28 w-28 rounded-full bg-white/60 blur-2xl" />
      <div className="absolute right-4 top-4 h-16 w-16 rounded-[20px] border border-white/60 bg-white/45" />
    </article>
  );

  if (target.startsWith('http://') || target.startsWith('https://')) {
    return <a href={target} target="_blank" rel="noreferrer" className="block h-full">{content}</a>;
  }

  return <Link href={target} className="block h-full">{content}</Link>;
}

function ProductTile({ product, onBuy, isBuying, lowBalance }) {
  const href = product?.id ? `/shop/${encodeURIComponent(String(product.id))}` : '/shop';
  const pricing = getProductPricing(product, 1);
  const cover = getProductCover(product);

  return (
    <article className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <Link href={href} className="block">
        <div className="relative aspect-[1/1] overflow-hidden bg-[#f8fafc]">
          {cover ? (
            <img src={cover} alt={product?.name || 'Product'} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#eff6ff] via-[#f8fafc] to-[#ecfeff] text-slate-400">
              <Store size={24} />
            </div>
          )}
        </div>
      </Link>
      <div className="space-y-2.5 p-3">
        <div>
          <p className="truncate text-[10px] font-medium text-slate-500">{getProductMeta(product)}</p>
          <Link href={href} className="block">
            <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-5 text-slate-900">{product?.name || 'Unnamed product'}</h3>
          </Link>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[15px] font-bold text-slate-900">{currency(pricing.finalPrice)}</p>
            {pricing.compareAtPrice > 0 ? <p className="text-[10px] text-slate-400 line-through">{currency(pricing.compareAtPrice)}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => {
              const nextCount = addToCart(product, 1);
              if (!nextCount) {
                toast.error('Unable to add this product to cart');
                return;
              }
              toast.success(`Added to cart (${nextCount})`);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700"
            aria-label="Add to cart"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onBuy?.(product)}
          disabled={isBuying || lowBalance}
          className="inline-flex min-h-[38px] w-full items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isBuying ? 'Processing...' : lowBalance ? 'Low Balance' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}

function CartPill() {
  const [count, setCount] = useState(0);

  useEffect(() => subscribeCart(setCount), []);

  return (
    <Link
      href="/cart"
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.05)]"
      aria-label={`Open cart${count ? ` with ${count} item${count === 1 ? '' : 's'}` : ''}`}
    >
      <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">
        <ShoppingCart size={12} />
      </span>
      <span className="text-[11px] font-semibold text-slate-900">Cart</span>
      <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
        {count}
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: productData, isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useProducts();
  const bannersQuery = useQuery({ queryKey: queryKeys.homepageBanners, queryFn: getHomepageBanners });
  const auctionsQuery = useQuery({ queryKey: [...queryKeys.auctions, 'home'], queryFn: () => getAuctions({ page: 1, limit: 6 }) });
  const [meQuery, walletQuery] = useQueries({
    queries: [
      { queryKey: queryKeys.me, queryFn: getMe },
      { queryKey: queryKeys.wallet, queryFn: getWallet }
    ]
  });
  const queryClient = useQueryClient();
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerTrackRef = useRef(null);
  const [buyingProductId, setBuyingProductId] = useState('');

  const buyMutation = useMutation({
    mutationFn: (product) => {
      const total = getProductPricing(product, 1).lineFinalTotal;
      if (!hasSufficientWalletBalance(walletQuery.data, total)) {
        throw new Error('Insufficient wallet balance');
      }
      return createOrder({ chargeWallet: true, items: [{ productId: product.id, quantity: 1 }] });
    },
    onMutate: (product) => setBuyingProductId(product?.id || ''),
    onSuccess: async () => {
      toast.success('Order placed successfully. Dashboard is updating.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.me })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Order failed. Please try again.'),
    onSettled: () => setBuyingProductId('')
  });

  const isLoading = productsLoading || meQuery.isLoading || walletQuery.isLoading || bannersQuery.isLoading;
  const hasFatalError = meQuery.isError || walletQuery.isError;
  const user = meQuery.data || {};
  const products = Array.isArray(productData) ? productData : [];
  const liveAuctions = Array.isArray(auctionsQuery.data?.data) ? auctionsQuery.data.data : [];
  const homepageBanners = Array.isArray(bannersQuery.data) ? bannersQuery.data : [];

  const slides = useMemo(() => {
    if (homepageBanners.length) {
      return homepageBanners.map((banner, idx) => ({
        id: banner.id || `banner-${idx}`,
        title: banner.title || 'Featured offer',
        subtitle: banner.subtitle || '',
        ctaText: banner.cta_text || '',
        targetLink: banner.target_link || '/shop',
        imageUrl: banner.image_url || '',
        theme: idx % 2 === 0 ? 'from-[#dbeafe] via-[#eff6ff] to-[#ffffff]' : 'from-[#fef3c7] via-[#fff7ed] to-[#ffffff]'
      }));
    }

    return fallbackSlides;
  }, [homepageBanners]);

  const popularProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        if (Boolean(b?.is_qualifying) !== Boolean(a?.is_qualifying)) return Number(Boolean(b?.is_qualifying)) - Number(Boolean(a?.is_qualifying));
        return Number(b?.price || 0) - Number(a?.price || 0);
      })
      .slice(0, 6);
  }, [products]);

  const auctionSummary = useMemo(() => {
    const liveCount = liveAuctions.filter((item) => item?.status === 'live').length;
    const upcomingCount = liveAuctions.filter((item) => item?.status === 'upcoming').length;
    return {
      liveCount,
      upcomingCount
    };
  }, [liveAuctions]);

  useEffect(() => {
    setActiveBannerIndex(0);
    const track = bannerTrackRef.current;
    if (track) track.scrollTo({ left: 0, behavior: 'auto' });
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveBannerIndex((prev) => {
        const next = (prev + 1) % slides.length;
        const track = bannerTrackRef.current;
        if (track) track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
        return next;
      });
    }, 4200);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (isLoading) return <DashboardSkeleton />;

  if (hasFatalError) {
    return (
      <ErrorState
        message="Home page data could not be loaded."
        onRetry={() => {
          meQuery.refetch();
          walletQuery.refetch();
          bannersQuery.refetch();
          refetchProducts();
          auctionsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="-mx-4 min-h-full bg-[#f5f7fb] px-4 pb-24 pt-1.5 sm:mx-0 sm:rounded-[32px] sm:border sm:border-slate-200 sm:px-5 sm:py-3">
      <div className="mx-auto max-w-xl space-y-3">
        <section className="px-1 pt-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">My Location</p>
              <div className="mt-0.5 flex items-center gap-1">
                <h1 className="truncate text-[15px] font-semibold tracking-[-0.03em] text-slate-900">{buildLocationLabel(user)}</h1>
                <ChevronRight size={13} className="shrink-0 text-slate-400" />
              </div>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">{buildLocationDetail(user)}</p>
            </div>

            <div className="flex items-center gap-2">
              <CartPill />
              <button
                type="button"
                aria-label="Notifications"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
              >
                <Bell size={15} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              readOnly
              value=""
              placeholder="Search products, deals, groceries"
              className="w-full rounded-[18px] border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-[12px] text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] outline-none placeholder:text-slate-400"
            />
          </label>
        </section>

        <section className="space-y-1.5">
          <div
            ref={bannerTrackRef}
            onScroll={(event) => {
              const width = event.currentTarget.clientWidth || 1;
              const index = Math.round(event.currentTarget.scrollLeft / width);
              if (index !== activeBannerIndex) setActiveBannerIndex(index);
            }}
            className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth pb-0.5"
          >
            {slides.map((banner) => (
              <div key={banner.id} className="min-w-full snap-start">
                {banner.imageUrl ? (
                  <Link href={resolveBannerTarget(banner.targetLink)} className="relative block overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                    <img src={banner.imageUrl} alt={banner.title || 'Homepage banner'} className="h-[168px] w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/55 via-slate-900/20 to-transparent p-4 text-white">
                      <div className="max-w-[72%]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">Hope Marketplace</p>
                        <h2 className="mt-2 text-[18px] font-semibold leading-5">{banner.title}</h2>
                        {banner.subtitle ? <p className="mt-2 line-clamp-2 text-[12px] leading-4 text-white/90">{banner.subtitle}</p> : null}
                        {banner.ctaText ? <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900">{banner.ctaText}</span> : null}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <HomeBannerCard banner={banner} />
                )}
              </div>
            ))}
          </div>

          {slides.length > 1 ? (
            <div className="flex items-center justify-center gap-1.5">
              {slides.map((banner, idx) => (
                <button
                  key={`${banner.id}-dot`}
                  type="button"
                  aria-label={`Go to banner ${idx + 1}`}
                  onClick={() => {
                    setActiveBannerIndex(idx);
                    const track = bannerTrackRef.current;
                    if (track) track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' });
                  }}
                  className={`h-2 rounded-full transition-all ${idx === activeBannerIndex ? 'w-6 bg-slate-900' : 'w-2 bg-slate-300'}`}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fef3c7,#fff7ed)] p-3 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
          <Link href="/auctions" className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] bg-white text-amber-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
              <Gavel size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Win Now</p>
              <p className="mt-0.5 text-[14px] font-semibold text-slate-900">Auctions</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-600">
                {auctionSummary.liveCount > 0
                  ? `${auctionSummary.liveCount} live now${auctionSummary.upcomingCount ? ` | ${auctionSummary.upcomingCount} upcoming` : ''}`
                  : 'Browse current and upcoming auctions'}
              </p>
            </div>
            <span className="inline-flex h-8 items-center rounded-full bg-slate-900 px-3 text-[11px] font-semibold text-white">
              Open
            </span>
          </Link>
        </section>

        <section className="rounded-[24px] bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Browse Services</h2>
              <p className="text-[11px] text-slate-500">Quick access to the main shopping areas</p>
            </div>
            <Link href="/shop" className="text-[11px] font-semibold text-slate-900">See all</Link>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {homeActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={getActionHref(action)}
                  className={`rounded-[20px] border px-2 py-3 text-center shadow-[0_8px_18px_rgba(15,23,42,0.04)] ${action.featured ? 'border-amber-200 bg-amber-50/70' : 'border-slate-200 bg-[#fbfcfe]'}`}
                >
                  <span className={`mx-auto inline-flex h-10 w-10 items-center justify-center rounded-[16px] ${action.tint}`}>
                    <Icon size={18} />
                  </span>
                  <p className="mt-2 text-[11px] font-semibold text-slate-900">{action.label}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-slate-900">Most Popular Products</h2>
              <p className="text-[12px] text-slate-500">Compact picks for quick shopping</p>
            </div>
            <Link href="/shop" className="text-[12px] font-semibold text-slate-900">View all</Link>
          </div>

          {productsError ? (
            <ErrorState message="Products could not be loaded." onRetry={refetchProducts} />
          ) : null}

          {!productsError && !popularProducts.length ? (
            <EmptyState title="No products yet" description="Products will appear here as soon as they are available." />
          ) : null}

          {!productsError && popularProducts.length ? (
            <div className="grid grid-cols-2 gap-3">
              {popularProducts.map((product) => {
                const lineTotal = getProductPricing(product, 1).lineFinalTotal;
                const lowBalance = !walletQuery.isError && !walletQuery.isLoading && !hasSufficientWalletBalance(walletQuery.data, lineTotal);

                return (
                  <ProductTile
                    key={product.id}
                    product={product}
                    onBuy={(item) => buyMutation.mutate(item)}
                    isBuying={buyMutation.isPending && buyingProductId === product.id}
                    lowBalance={lowBalance}
                  />
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold text-slate-900">Premium everyday shopping</p>
              <p className="mt-1 text-[12px] text-slate-500">Simple layout, faster access, and connected product flow.</p>
            </div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <Sparkles size={18} />
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
