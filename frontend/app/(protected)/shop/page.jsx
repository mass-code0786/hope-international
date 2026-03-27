'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Menu, Search, ShoppingCart, Truck, ShieldCheck, BadgePercent, Headset, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProductFilters } from '@/components/shop/ProductFilters';
import { ProductCard } from '@/components/shop/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ShopSkeleton } from '@/components/ui/PageSkeletons';
import { LogoMark } from '@/components/brand/HopeLogo';
import { useProducts } from '@/hooks/useProducts';
import { createOrder } from '@/lib/services/ordersService';
import { getHomepageBanners } from '@/lib/services/bannersService';
import { queryKeys } from '@/lib/query/queryKeys';
import { subscribeCart } from '@/lib/utils/cart';

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
  { icon: Headset, title: 'Support' }
];

const categoryKeywords = {
  grocery: ['grocery', 'rashan', 'ration', 'atta', 'rice', 'dal', 'oil', 'spice', 'daily-use'],
  fashion: ['fashion', 'clothing', 'apparel', 'wear', 'shirt', 'shoe', 'style'],
  mobile: ['mobile', 'phone', 'smartphone', 'android', 'ios'],
  gadgets: ['gadget', 'electronics', 'earbuds', 'charger', 'accessory', 'device'],
  beauty: ['beauty', 'skin', 'cosmetic', 'makeup'],
  health: ['health', 'wellness', 'nutrition', 'supplement', 'care'],
  physical: ['physical', 'kit', 'pack', 'product'],
  digital: ['digital', 'online', 'software', 'ebook', 'subscription', 'course', 'training']
};

function SectionTitle({ title, count }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-medium text-slate-600">{count}</span>
    </div>
  );
}

function categoryMatch(product, activeCategory) {
  if (activeCategory === 'All') return true;

  const haystack = `${product?.name || ''} ${product?.description || ''}`.toLowerCase();
  const normalized = activeCategory.toLowerCase();
  const keywords = categoryKeywords[normalized] || [];
  const labelTokens = normalized.split(/[^a-z0-9]+/g).filter(Boolean);

  return keywords.some((keyword) => haystack.includes(keyword)) || labelTokens.some((token) => haystack.includes(token));
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

export default function ShopPage() {
  const { data, isLoading, isError, refetch } = useProducts();
  const bannersQuery = useQuery({ queryKey: queryKeys.homepageBanners, queryFn: getHomepageBanners });
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [buyingProductId, setBuyingProductId] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerTrackRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => subscribeCart(setCartCount), []);

  const buyMutation = useMutation({
    mutationFn: (product) => createOrder({ items: [{ productId: product.id, quantity: 1 }] }),
    onMutate: (product) => {
      setBuyingProductId(product?.id || '');
    },
    onSuccess: async () => {
      toast.success('Order placed successfully. Dashboard is updating.');
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

  const products = Array.isArray(data) ? data : [];
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
      const text = `${product?.name || ''} ${product?.description || ''}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesCategory = categoryMatch(product, activeCategory);
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  const deals = useMemo(() => filtered.filter((item) => item.is_qualifying).slice(0, 12), [filtered]);
  const recommended = useMemo(() => filtered.slice(0, 12), [filtered]);
  const newArrivals = useMemo(() => [...filtered].slice(-12).reverse(), [filtered]);
  const trending = useMemo(() => [...filtered].sort((a, b) => Number(b.price || 0) - Number(a.price || 0)).slice(0, 12), [filtered]);

  const hasProducts = !isLoading && !isError && filtered.length > 0;

  return (
    <div className="-mx-4 space-y-3 bg-[#f8fafc] px-3 pb-2 pt-0 sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-200 sm:px-4 sm:py-3">
      <section className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-[#f8fafc]">
            <LogoMark size={16} />
          </span>

          <label className="relative min-w-0 flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              className="w-full rounded-lg border border-slate-200 bg-[#f8fafc] py-2 pl-8 pr-2 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <Link href="/cart" className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
            <ShoppingCart size={14} />
            <span className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-semibold text-white">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          </Link>
          <Link href="/profile" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
            <User size={14} />
          </Link>
          <button className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700" aria-label="Open menu">
            <Menu size={14} />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-2.5">
        <ProductFilters activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
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
                <Link href={resolveBannerTarget(banner.targetLink)} className="relative block overflow-hidden rounded-xl border border-slate-200">
                  <img src={banner.imageUrl} alt={banner.title || 'Offer banner'} className="h-[132px] w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900/45 via-slate-800/20 to-transparent p-3 text-white">
                    <p className="line-clamp-2 text-[14px] font-semibold leading-4">{banner.title}</p>
                    {banner.subtitle ? <p className="mt-1 line-clamp-2 text-[10px] text-white/90">{banner.subtitle}</p> : null}
                    {banner.ctaText ? <span className="mt-2 inline-flex rounded-full border border-white/50 bg-white/20 px-2.5 py-1 text-[10px] font-medium">{banner.ctaText}</span> : null}
                  </div>
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
          return (
            <article key={item.title} className="rounded-md bg-slate-50 p-1 text-center">
              <span className="mx-auto inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                <Icon size={10} />
              </span>
              <p className="mt-0.5 text-[8px] font-medium text-slate-700">{item.title}</p>
            </article>
          );
        })}
      </section>

      {isLoading ? <ShopSkeleton /> : null}
      {isError ? <ErrorState message="Products could not be loaded. Please check your connection and retry." onRetry={refetch} /> : null}

      {!isLoading && !isError && filtered.length === 0 ? (
        <EmptyState title="No matching products" description="Try different keywords or switch categories to discover more offers." />
      ) : null}

      {hasProducts ? (
        <section className="space-y-4 pb-14">
          <div>
            <SectionTitle title="Deals of the Day" count={deals.length || 0} />
            <div className="grid grid-cols-3 gap-1.5">
              {(deals.length ? deals : recommended).map((product) => (
                <ProductCard
                  key={`deal-${product.id}`}
                  product={product}
                  onBuy={(p) => buyMutation.mutate(p)}
                  isBuying={buyMutation.isPending && buyingProductId === product.id}
                  disableBuying={false}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionTitle title="Recommended" count={recommended.length} />
            <div className="grid grid-cols-3 gap-1.5">
              {recommended.map((product) => (
                <ProductCard
                  key={`recommended-${product.id}`}
                  product={product}
                  onBuy={(p) => buyMutation.mutate(p)}
                  isBuying={buyMutation.isPending && buyingProductId === product.id}
                  disableBuying={false}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionTitle title="New Arrivals" count={newArrivals.length} />
            <div className="grid grid-cols-3 gap-1.5">
              {newArrivals.map((product) => (
                <ProductCard
                  key={`new-${product.id}`}
                  product={product}
                  onBuy={(p) => buyMutation.mutate(p)}
                  isBuying={buyMutation.isPending && buyingProductId === product.id}
                  disableBuying={false}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionTitle title="Trending" count={trending.length} />
            <div className="grid grid-cols-3 gap-1.5">
              {trending.map((product) => (
                <ProductCard
                  key={`trending-${product.id}`}
                  product={product}
                  onBuy={(p) => buyMutation.mutate(p)}
                  isBuying={buyMutation.isPending && buyingProductId === product.id}
                  disableBuying={false}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
