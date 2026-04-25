'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect, useRef, useDeferredValue } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Menu,
  Search,
  Truck,
  ShieldCheck,
  BadgePercent,
  Headset,
  User,
  X,
  Wallet,
  HandCoins,
  ArrowUpDown,
  History,
  BadgeDollarSign,
  Users,
  Store,
  LogOut,
  Settings,
  ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BannerImageFrame } from '@/components/banners/BannerImageFrame';
import { ProductFilters } from '@/components/shop/ProductFilters';
import { ProductCard } from '@/components/shop/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Header } from '@/components/layout/Header';
import { useInfiniteProducts } from '@/hooks/useProducts';
import { useSessionUser } from '@/hooks/useSessionUser';
import { useWallet } from '@/hooks/useWallet';
import { createOrder } from '@/lib/services/ordersService';
import { currency } from '@/lib/utils/format';
import { getHomepageBanners } from '@/lib/services/bannersService';
import { queryKeys } from '@/lib/query/queryKeys';
import { useAuthStore } from '@/lib/store/authStore';
import { subscribeCart } from '@/lib/utils/cart';
import { clearStoredToken } from '@/lib/utils/tokenStorage';
import { clearProtectedQueries } from '@/lib/utils/logout';
import { getAvailableWalletBalance, hasSufficientWalletBalance } from '@/lib/utils/wallet';
import { getProductPricing } from '@/lib/utils/pricing';
import { SHOP_PRODUCTS_PAGE_LIMIT } from '@/lib/constants/catalog';

const PurchaseAddressModal = dynamic(() => import('@/components/shop/PurchaseAddressModal').then((mod) => mod.PurchaseAddressModal));
const PurchaseConfirmModal = dynamic(() => import('@/components/shop/PurchaseConfirmModal').then((mod) => mod.PurchaseConfirmModal));

const fallbackSlides = [
  {
    id: 'fallback-1',
    title: 'Deals for Smart Shopping',
    subtitle: 'Daily savings across your favorite categories',
    ctaText: 'Shop Deals',
    targetLink: '/shop',
    theme: 'from-[#e0f2fe] to-[#dbeafe]'
  },
  {
    id: 'fallback-2',
    title: 'Fresh Arrivals',
    subtitle: 'New picks curated for your profile',
    ctaText: 'View Picks',
    targetLink: '/shop',
    theme: 'from-[#ecfeff] to-[#dcfce7]'
  }
];

const serviceCards = [
  { icon: Truck, title: 'Fast Shipping' },
  { icon: ShieldCheck, title: 'Secure Checkout' },
  { icon: BadgePercent, title: 'Daily Offers' },
  { icon: Headset, title: 'Support', href: '/support' }
];

const accountHubSections = [
  {
    title: 'Wallet & Finance',
    items: [
      { label: 'Wallet Overview', href: '/wallet', icon: Wallet },
      { label: 'Deposit', href: '/deposit', icon: BadgeDollarSign },
      { label: 'Withdrawal', href: '/withdraw', icon: HandCoins },
      { label: 'P2P Transfer', href: '/p2p', icon: ArrowUpDown },
      { label: 'Deposit History', href: '/history/deposit', icon: History },
      { label: 'Withdrawal History', href: '/history/withdraw', icon: History }
    ]
  },
  {
    title: 'Income',
    items: [
      { label: 'All Income History', href: '/history/income', icon: History },
      { label: 'Direct / Matching / Reward', href: '/income', icon: BadgeDollarSign }
    ]
  },
  {
    title: 'Orders / Shop',
    items: [
      { label: 'Order History', href: '/history/orders', icon: Store },
      { label: 'Active / Completed / Cancelled', href: '/orders', icon: Store }
    ]
  },
  {
    title: 'Auctions',
    items: [
      { label: 'Browse Auctions', href: '/auctions', icon: HandCoins },
      { label: 'My Bids', href: '/history/auctions?kind=bids', icon: History },
      { label: 'Auctions Joined', href: '/history/auctions?kind=joined', icon: History },
      { label: 'Won Auctions', href: '/history/auctions?kind=wins', icon: History }
    ]
  },
  {
    title: 'Team / Plan',
    items: [
      { label: 'Team History', href: '/team', icon: Users },
      { label: 'Referral History', href: '/team', icon: Users },
      { label: 'Sponsor / Downline', href: '/team', icon: Users }
    ]
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/profile', icon: User },
      { label: 'Referral Link', href: '/profile', icon: BadgePercent },
      { label: 'Manage Wallet Address', href: '/wallet', icon: Wallet },
      { label: 'Settings', href: '/profile', icon: Settings }
    ]
  }
];

function SectionTitle({ title, count }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-medium text-slate-600">{count}</span>
    </div>
  );
}

function resolveBannerTarget(targetLink) {
  if (!targetLink) return '/shop';
  if (targetLink.startsWith('http://') || targetLink.startsWith('https://')) return targetLink;
  if (targetLink.startsWith('/')) return targetLink;
  return `/${targetLink}`;
}

function BannerCard({ banner }) {
  const target = resolveBannerTarget(banner.targetLink);
  const content = (
    <article className="h-full min-h-[132px] rounded-xl border border-slate-200 bg-gradient-to-r from-[#e0f2fe] to-[#dcfce7] p-3">
      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-600">Hope Marketplace</p>
      <h2 className="mt-1 line-clamp-2 text-[14px] font-semibold leading-4 text-slate-900">{banner.title}</h2>
      <p className="mt-1 line-clamp-2 text-[10px] text-slate-600">{banner.subtitle || 'Smart offers curated for your profile'}</p>
      {banner.ctaText ? (
        <span className="mt-3 inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700">
          {banner.ctaText}
        </span>
      ) : null}
    </article>
  );

  if (target.startsWith('http://') || target.startsWith('https://')) {
    return <a href={target} target="_blank" rel="noreferrer" className="block h-full">{content}</a>;
  }

  return <Link href={target} className="block h-full">{content}</Link>;
}

function ShopCartButton() {
  const [count, setCount] = useState(0);

  useEffect(() => subscribeCart(setCount), []);

  return (
    <Link
      href="/cart"
      aria-label={`Open cart${count ? ` with ${count} item${count === 1 ? '' : 's'}` : ''}`}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-2.5 text-slate-700 shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white">
        <ShoppingCart size={11} />
      </span>
      <span className="text-[11px] font-semibold text-slate-900">Cart</span>
      <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
        {count}
      </span>
    </Link>
  );
}

export default function ShopPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [bannersEnabled, setBannersEnabled] = useState(false);
  const [walletEnabled, setWalletEnabled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [secondarySectionsEnabled, setSecondarySectionsEnabled] = useState(false);
  const selectedCategory = activeCategory === 'All' ? undefined : activeCategory;
  const deferredSearch = useDeferredValue(search);
  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteProducts({ limit: SHOP_PRODUCTS_PAGE_LIMIT, category: selectedCategory, includeTotal: false });
  const bannersQuery = useQuery({
    queryKey: queryKeys.homepageBanners,
    queryFn: getHomepageBanners,
    enabled: bannersEnabled,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
  const sessionUser = useSessionUser();
  const walletQuery = useWallet({ enabled: walletEnabled });
  const clearSession = useAuthStore((state) => state.clearSession);
  const [buyingProductId, setBuyingProductId] = useState('');
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [addressStepProduct, setAddressStepProduct] = useState(null);
  const [selectedPurchaseAddress, setSelectedPurchaseAddress] = useState(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerTrackRef = useRef(null);
  const loadMoreRef = useRef(null);
  const queryClient = useQueryClient();
  const productPages = Array.isArray(data?.pages) ? data.pages : [];
  const products = productPages.flatMap((page) => (Array.isArray(page?.data) ? page.data : []));
  const primaryCatalogReady = productPages.length > 0 || isError || (!isPending && data !== undefined);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!primaryCatalogReady) return undefined;

    let cancelled = false;
    let idleId = null;
    let timeoutId = null;

    const enable = () => {
      if (!cancelled) setBannersEnabled(true);
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(enable, { timeout: 1500 });
    } else {
      timeoutId = window.setTimeout(enable, 700);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [primaryCatalogReady]);

  useEffect(() => {
    if (!primaryCatalogReady) return undefined;

    let cancelled = false;
    let idleId = null;
    let timeoutId = null;

    const enable = () => {
      if (!cancelled) setWalletEnabled(true);
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(enable, { timeout: 1800 });
    } else {
      timeoutId = window.setTimeout(enable, 900);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [primaryCatalogReady]);

  useEffect(() => {
    if (!primaryCatalogReady) return undefined;

    let cancelled = false;
    let idleId = null;
    let timeoutId = null;

    const enable = () => {
      if (!cancelled) setSecondarySectionsEnabled(true);
    };

    setSecondarySectionsEnabled(false);

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(enable, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(enable, 450);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [activeCategory, primaryCatalogReady]);

  const buyMutation = useMutation({
    mutationFn: (product) => {
      const total = getProductPricing(product, 1).lineFinalTotal;
      if (!hasSufficientWalletBalance(walletQuery.data, total)) {
        throw new Error('Insufficient wallet balance');
      }
      if (!selectedPurchaseAddress?.id) {
        throw new Error('Delivery address is required');
      }
      return createOrder({
        addressId: selectedPurchaseAddress.id,
        chargeWallet: true,
        paymentSource: 'deposit_wallet',
        items: [{ productId: product.id, quantity: 1 }]
      });
    },
    onMutate: (product) => {
      setBuyingProductId(product?.id || '');
    },
    onSuccess: async () => {
      toast.success('Order placed successfully. Dashboard is updating.');
      setPendingPurchase(null);
      setSelectedPurchaseAddress(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.me }),
        queryClient.invalidateQueries({ queryKey: queryKeys.weeklyCompensationRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.monthlyCompensationRoot })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Order failed. Please try again.'),
    onSettled: () => setBuyingProductId('')
  });

  const liveBanners = Array.isArray(bannersQuery.data) ? bannersQuery.data : [];

  const heroBanners = useMemo(() => {
    if (liveBanners.length) {
      return liveBanners.map((banner, idx) => ({
        id: banner.id || `live-${idx}`,
        imageUrl: banner.image_url || '',
        title: banner.title || 'Special Offer',
        subtitle: banner.subtitle || '',
        ctaText: banner.cta_text || '',
        targetLink: banner.target_link || '/shop'
      }));
    }

    return fallbackSlides;
  }, [liveBanners]);

  useEffect(() => {
    setActiveBannerIndex(0);
    const track = bannerTrackRef.current;
    if (track) {
      track.scrollTo({ left: 0, behavior: 'auto' });
    }
  }, [heroBanners.length]);

  useEffect(() => {
    if (heroBanners.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveBannerIndex((prev) => {
        const next = (prev + 1) % heroBanners.length;
        const track = bannerTrackRef.current;
        if (track) {
          track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
        }
        return next;
      });
    }, 4200);

    return () => window.clearInterval(timer);
  }, [heroBanners.length]);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const text = `${product?.name || product?.title || ''} ${product?.category || ''} ${product?.badge || ''}`.toLowerCase();
      return text.includes(deferredSearch.toLowerCase());
    });
  }, [deferredSearch, products]);

  const deals = useMemo(() => filtered.filter((item) => item.is_qualifying).slice(0, 12), [filtered]);
  const recommended = useMemo(() => filtered, [filtered]);
  const newArrivals = useMemo(() => [...filtered].slice(-12).reverse(), [filtered]);
  const trending = useMemo(() => [...filtered].sort((a, b) => Number(b.price || 0) - Number(a.price || 0)).slice(0, 12), [filtered]);
  const visibleDeals = useMemo(() => (deals.length ? deals : recommended).slice(0, 8), [deals, recommended]);
  const visibleRecommended = useMemo(() => recommended, [recommended]);

  const isProductsLoading = isPending && !data;
  const hasProducts = !isError && filtered.length > 0;
  const user = sessionUser.data || {};
  const walletBalance = getAvailableWalletBalance(walletQuery.data);
  const walletReady = !walletQuery.isLoading && !walletQuery.isError;
  const pendingPayableAmount = pendingPurchase ? getProductPricing(pendingPurchase, 1).lineFinalTotal : 0;
  const pendingCanAfford = pendingPurchase ? hasSufficientWalletBalance(walletQuery.data, pendingPayableAmount) : true;
  const reachedAllProducts = !hasNextPage;
  const visibleCatalogCount = filtered.length;

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return undefined;

    const node = loadMoreRef.current;
    if (!node || typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fetchNextPage();
        }
      },
      { rootMargin: '220px 0px' }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, visibleCatalogCount]);

  return (
    <>
      <div className="-mx-4 space-y-3 bg-[#f8fafc] px-3 pb-2 pt-0 sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-200 sm:px-4 sm:py-3">
        <Header
          rightSlot={(
            <>
              <ShopCartButton />
              <Link href="/profile" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700" aria-label="Open profile">
                <User size={14} />
              </Link>
              <button
                onClick={() => setMenuOpen(true)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
                aria-label="Open menu"
              >
                <Menu size={14} />
              </button>
            </>
          )}
        />

      <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <label className="relative block">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className="w-full rounded-lg border border-slate-200 bg-[#f8fafc] py-2 pl-8 pr-2 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-2.5">
        <ProductFilters activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] text-slate-600">
          <Wallet size={11} />
          Wallet: {walletEnabled && walletReady ? currency(walletBalance) : 'Loading...'}
        </div>
      </section>

      <section className="space-y-2">
        <div
          ref={bannerTrackRef}
          onScroll={(event) => {
            const width = event.currentTarget.clientWidth || 1;
            const index = Math.round(event.currentTarget.scrollLeft / width);
            if (index !== activeBannerIndex) setActiveBannerIndex(index);
          }}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        >
          {heroBanners.map((banner) => (
            <div key={banner.id} className="min-w-full snap-start pr-1">
              {banner.imageUrl ? (
                <Link href={resolveBannerTarget(banner.targetLink)} className="block">
                  <BannerImageFrame
                    src={banner.imageUrl}
                    alt={banner.title || 'Offer banner'}
                    className="h-[190px] overflow-hidden rounded-xl border border-slate-200 sm:h-[210px] md:h-[230px]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/28 to-transparent p-3 text-white">
                      <p className="line-clamp-2 text-[14px] font-semibold leading-4">{banner.title}</p>
                      {banner.subtitle ? <p className="mt-1 line-clamp-2 text-[10px] text-white/90">{banner.subtitle}</p> : null}
                      {banner.ctaText ? <span className="mt-2 inline-flex rounded-full border border-white/50 bg-white/20 px-2.5 py-1 text-[10px] font-medium">{banner.ctaText}</span> : null}
                    </div>
                  </BannerImageFrame>
                </Link>
              ) : (
                <BannerCard banner={banner} />
              )}
            </div>
          ))}
        </div>

        {heroBanners.length > 1 ? (
          <div className="flex items-center justify-center gap-1">
            {heroBanners.map((banner, idx) => (
              <button
                key={`${banner.id}-dot`}
                onClick={() => {
                  setActiveBannerIndex(idx);
                  const track = bannerTrackRef.current;
                  if (track) {
                    track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' });
                  }
                }}
                className={`h-1.5 rounded-full transition-all ${idx === activeBannerIndex ? 'w-4 bg-sky-500' : 'w-1.5 bg-slate-300'}`}
                aria-label={`Go to banner ${idx + 1}`}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-4 gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5">
        {serviceCards.map((item) => {
          const Icon = item.icon;
          const card = (
            <article className="rounded-md bg-slate-50 p-1 text-center transition hover:bg-slate-100">
              <span className="mx-auto inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                <Icon size={10} />
              </span>
              <p className="mt-0.5 text-[8px] font-medium text-slate-700">{item.title}</p>
            </article>
          );

          if (item.href) {
            return <Link key={item.title} href={item.href}>{card}</Link>;
          }

          return <div key={item.title}>{card}</div>;
        })}
      </section>

      {isError ? <ErrorState message="Products could not be loaded. Please check your connection and retry." onRetry={refetch} /> : null}

      {!isProductsLoading && !isError && filtered.length === 0 ? (
        <EmptyState title="No matching products" description="Try different keywords or switch categories to discover more offers." />
      ) : null}

      {hasProducts ? (
        <section className="space-y-4 pb-14">
          <div>
            <SectionTitle title="Deals of the Day" count={deals.length || 0} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {visibleDeals.map((product, index) => (
                <ProductCard
                  key={`deal-${product.id}`}
                  product={product}
                  prioritizeImage={index < 4}
                  onBuy={(p) => setAddressStepProduct(p)}
                  isBuying={buyMutation.isPending && buyingProductId === product.id}
                  disableBuying={walletReady && !hasSufficientWalletBalance(walletQuery.data, getProductPricing(product, 1).lineFinalTotal)}
                  buyLabel={walletReady && !hasSufficientWalletBalance(walletQuery.data, getProductPricing(product, 1).lineFinalTotal) ? 'Low Balance' : 'Buy Now'}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionTitle title={activeCategory === 'All' ? 'All Products' : `${activeCategory} Products`} count={recommended.length} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {visibleRecommended.map((product, index) => (
                <ProductCard
                  key={`recommended-${product.id}`}
                  product={product}
                  prioritizeImage={index < 4}
                  onBuy={(p) => setAddressStepProduct(p)}
                  isBuying={buyMutation.isPending && buyingProductId === product.id}
                  disableBuying={walletReady && !hasSufficientWalletBalance(walletQuery.data, getProductPricing(product, 1).lineFinalTotal)}
                  buyLabel={walletReady && !hasSufficientWalletBalance(walletQuery.data, getProductPricing(product, 1).lineFinalTotal) ? 'Low Balance' : 'Buy Now'}
                />
              ))}
            </div>
            {!reachedAllProducts ? (
              <p className="mt-2 text-center text-[10px] text-slate-500">
                Showing {visibleCatalogCount} products. More items load as you browse.
              </p>
            ) : reachedAllProducts ? (
              <p className="mt-2 text-center text-[10px] text-slate-500">
                Showing all {visibleCatalogCount} matching {activeCategory === 'All' ? 'active products' : activeCategory.toLowerCase() + ' products'}
              </p>
            ) : null}
          </div>

          {secondarySectionsEnabled ? (
            <>
              <div>
                <SectionTitle title="New Arrivals" count={newArrivals.length} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {newArrivals.map((product, index) => (
                    <ProductCard
                      key={`new-${product.id}`}
                      product={product}
                      prioritizeImage={index < 2}
                      onBuy={(p) => setAddressStepProduct(p)}
                      isBuying={buyMutation.isPending && buyingProductId === product.id}
                      disableBuying={walletReady && !hasSufficientWalletBalance(walletQuery.data, getProductPricing(product, 1).lineFinalTotal)}
                      buyLabel={walletReady && !hasSufficientWalletBalance(walletQuery.data, getProductPricing(product, 1).lineFinalTotal) ? 'Low Balance' : 'Buy Now'}
                    />
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle title="Trending" count={trending.length} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {trending.map((product, index) => (
                    <ProductCard
                      key={`trending-${product.id}`}
                      product={product}
                      prioritizeImage={index < 2}
                      onBuy={(p) => setAddressStepProduct(p)}
                      isBuying={buyMutation.isPending && buyingProductId === product.id}
                      disableBuying={walletReady && !hasSufficientWalletBalance(walletQuery.data, getProductPricing(product, 1).lineFinalTotal)}
                      buyLabel={walletReady && !hasSufficientWalletBalance(walletQuery.data, getProductPricing(product, 1).lineFinalTotal) ? 'Low Balance' : 'Buy Now'}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : null}
          {hasNextPage ? <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" /> : null}
          {isFetchingNextPage ? <p className="text-center text-[10px] text-slate-500">Loading more products...</p> : null}
        </section>
      ) : null}

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-slate-950/30" aria-label="Close account panel" onClick={() => setMenuOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto border-l border-slate-200 bg-[#f8fafc] p-3 shadow-2xl">
            <div className="sticky top-0 z-10 mb-3 rounded-xl border border-slate-200 bg-white p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900">{user?.first_name || user?.username || 'Account'}</p>
                  <p className="truncate text-[10px] text-slate-500">@{user?.username || 'member'}</p>
                  <p className="text-[10px] text-slate-400">ID: {String(user?.id || '-').slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
                  aria-label="Close menu"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 pb-3">
              {accountHubSections.map((section) => (
                <section key={section.title} className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{section.title}</p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={`${section.title}-${item.label}`}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Icon size={13} className="text-slate-500" />
                            {item.label}
                          </span>
                          <span className="text-[10px] text-slate-400">Open</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <button
              onClick={async () => {
                clearStoredToken();
                clearSession({ loggingOut: true });
                await clearProtectedQueries(queryClient);
                setMenuOpen(false);
                toast.success('Logged out');
                router.replace('/login');
              }}
              className="mb-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600"
            >
              <LogOut size={14} />
              Logout
            </button>
          </aside>
        </div>
      ) : null}
      </div>

        <PurchaseConfirmModal
        open={Boolean(pendingPurchase)}
        product={pendingPurchase}
        deliveryAddress={selectedPurchaseAddress}
        paymentSourceLabel="Deposit Wallet"
        availableBalance={walletBalance}
        payableAmount={pendingPayableAmount}
        canAfford={pendingCanAfford}
        loading={buyMutation.isPending}
        onClose={() => {
          if (!buyMutation.isPending) {
            setPendingPurchase(null);
            setSelectedPurchaseAddress(null);
          }
        }}
        onConfirm={() => {
          if (!pendingPurchase || buyMutation.isPending) return;
          buyMutation.mutate(pendingPurchase);
        }}
      />
      <PurchaseAddressModal
        open={Boolean(addressStepProduct)}
        product={addressStepProduct}
        onClose={() => {
          setAddressStepProduct(null);
        }}
        onContinue={(address) => {
          setSelectedPurchaseAddress(address);
          setPendingPurchase(addressStepProduct);
          setAddressStepProduct(null);
        }}
      />
    </>
  );
}
