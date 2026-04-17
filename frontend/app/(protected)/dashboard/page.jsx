'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Baby,
  Bell,
  ChevronRight,
  Gavel,
  HeartPulse,
  PackagePlus,
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
import { EmptyState } from '@/components/ui/EmptyState';
import { WelcomeSpinModal } from '@/components/auth/WelcomeSpinModal';
import { PurchaseConfirmModal } from '@/components/shop/PurchaseConfirmModal';
import { getHomepageBanners } from '@/lib/services/bannersService';
import { createOrder } from '@/lib/services/ordersService';
import { getUserAddress } from '@/lib/services/userAddressService';
import { getUnreadNotificationCount } from '@/lib/services/notificationsService';
import { getWallet } from '@/lib/services/walletService';
import { claimWelcomeSpin, getWelcomeSpinStatus } from '@/lib/services/welcomeSpinService';
import { useHomeProducts } from '@/hooks/useProducts';
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
    theme: 'from-[#343743] via-[#2f323b] to-[#282b33]'
  },
  {
    id: 'home-fallback-2',
    title: 'Auctions worth watching',
    subtitle: 'Browse live and upcoming entries from home.',
    ctaText: 'Open auctions',
    targetLink: '/auctions',
    theme: 'from-[#383145] via-[#2f323b] to-[#282b33]'
  }
];

const homeActions = [
  { label: 'Shop', href: '/shop', icon: Store, tint: 'bg-[rgba(139,61,255,0.16)] text-[#d8b4fe]' },
  { label: 'Grocery', href: '/shop', icon: ShoppingBasket, tint: 'bg-[rgba(50,209,125,0.14)] text-[#86efac]' },
  { label: 'Health', href: '/shop', icon: HeartPulse, tint: 'bg-[rgba(248,113,113,0.14)] text-[#fda4af]' },
  { label: 'Fashion', href: '/shop', icon: Shirt, tint: 'bg-[rgba(167,139,250,0.16)] text-[#ddd6fe]' },
  { label: 'Food', href: '/shop', icon: UtensilsCrossed, tint: 'bg-[rgba(246,183,60,0.14)] text-[#fcd34d]' },
  { label: 'Kids', href: '/shop', icon: Baby, tint: 'bg-[rgba(244,114,182,0.14)] text-[#f9a8d4]' },
  { label: 'Sports', href: '/shop', icon: Trophy, tint: 'bg-[rgba(34,211,238,0.14)] text-[#67e8f9]' },
  { label: 'Services', href: '/support', icon: PackagePlus, tint: 'bg-[rgba(192,199,212,0.12)] text-[#e2e8f0]' },
  { label: 'Auctions', href: '/auctions', icon: Gavel, tint: 'bg-[rgba(139,61,255,0.22)] text-[#ede9fe]', featured: true }
];

function resolveBannerTarget(targetLink) {
  if (!targetLink) return '/shop';
  if (targetLink.startsWith('http://') || targetLink.startsWith('https://')) return targetLink;
  if (targetLink.startsWith('/')) return targetLink;
  return `/${targetLink}`;
}

function buildLocationLabel(address) {
  const pieces = [address?.area, address?.city, address?.state].filter(Boolean);
  if (pieces.length) return pieces.join(', ');
  return 'Set your delivery area';
}

function buildLocationDetail(address) {
  if (address?.addressLine) return address.addressLine;
  if (address?.mobile) return address.mobile;
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
    <article className={`relative h-[124px] overflow-hidden rounded-[14px] border border-slate-200 bg-gradient-to-r ${banner.theme || 'from-[#343743] to-[#282b33]'} p-2.5 shadow-[0_10px_20px_rgba(15,23,42,0.08)]`}>
      <div className="relative z-10 max-w-[72%]">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Hope Marketplace</p>
        <h2 className="mt-1 text-[15px] font-semibold leading-4 text-slate-900">{banner.title}</h2>
        <p className="mt-1 line-clamp-2 text-[10px] leading-3.5 text-slate-500">{banner.subtitle || 'Curated picks for your account.'}</p>
        <span className="mt-2 inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-semibold text-white">
          {banner.ctaText || 'Explore'}
        </span>
      </div>
      <div className="absolute -right-5 bottom-0 h-20 w-20 rounded-full bg-[rgba(139,61,255,0.18)] blur-2xl" />
      <div className="absolute right-3 top-3 h-12 w-12 rounded-[14px] border border-white/10 bg-white/8" />
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
  const buyNowLabel = isBuying ? '...' : lowBalance ? 'Low' : 'Buy';

  return (
    <article className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
      <Link href={href} className="block">
        <div className="relative h-[146px] overflow-hidden bg-[#2b2e37]">
          {cover ? (
            <img
              src={cover}
              alt={product?.name || 'Product'}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#343743] via-[#2f323b] to-[#282b33] text-slate-400">
              <Store size={20} />
            </div>
          )}
        </div>
      </Link>
      <div className="space-y-1 p-2">
        <div className="min-h-[2.35rem]">
          <p className="truncate text-[9px] font-medium text-slate-500">{getProductMeta(product)}</p>
          <Link href={href} className="block">
            <h3 className="mt-0.5 line-clamp-2 text-[10.5px] font-semibold leading-4 text-slate-900">{product?.name || 'Unnamed product'}</h3>
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-slate-900">{currency(pricing.finalPrice)}</p>
            {pricing.compareAtPrice > 0 ? <p className="text-[8px] text-slate-400 line-through">{currency(pricing.compareAtPrice)}</p> : null}
          </div>
          <div className="flex items-center gap-1.5">
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
              className="inline-flex h-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[8px] font-semibold text-slate-700"
              aria-label="Add to cart"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => onBuy?.(product)}
              disabled={isBuying || lowBalance}
              className="inline-flex h-6 min-w-[30px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-1.5 text-[8px] font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={lowBalance ? 'Low balance' : 'Buy now'}
            >
              {buyNowLabel}
            </button>
          </div>
        </div>
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
  const router = useRouter();
  const { data: productData, isPending: productsPending, isError: productsError, refetch: refetchProducts } = useHomeProducts();
  const bannersQuery = useQuery({ queryKey: queryKeys.homepageBanners, queryFn: getHomepageBanners, placeholderData: (previousData) => previousData, staleTime: 300_000, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const addressQuery = useQuery({ queryKey: queryKeys.userAddress, queryFn: getUserAddress, placeholderData: (previousData) => previousData, staleTime: 300_000, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const notificationsCountQuery = useQuery({
    queryKey: queryKeys.notificationsUnreadCount,
    queryFn: getUnreadNotificationCount,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
  const walletQuery = useQuery({
    queryKey: queryKeys.wallet,
    queryFn: getWallet,
    placeholderData: (previousData) => previousData,
    staleTime: 45_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
  const queryClient = useQueryClient();
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerTrackRef = useRef(null);
  const [buyingProductId, setBuyingProductId] = useState('');
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [welcomeSpinOpen, setWelcomeSpinOpen] = useState(false);
  const welcomeSpinQuery = useQuery({
    queryKey: queryKeys.welcomeSpinStatus,
    queryFn: getWelcomeSpinStatus,
    placeholderData: (previousData) => previousData,
    staleTime: 45_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const buyMutation = useMutation({
    mutationFn: (product) => {
      const total = getProductPricing(product, 1).lineFinalTotal;
      if (!hasSufficientWalletBalance(walletQuery.data, total)) {
        throw new Error('Insufficient wallet balance');
      }
      if (!address?.id) {
        throw new Error('Add a delivery address before payment');
      }
      return createOrder({
        addressId: address.id,
        chargeWallet: true,
        paymentSource: 'deposit_wallet',
        items: [{ productId: product.id, quantity: 1 }]
      });
    },
    onMutate: (product) => setBuyingProductId(product?.id || ''),
    onSuccess: async () => {
      toast.success('Order placed successfully. Dashboard is updating.');
      setPendingPurchase(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.me }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Order failed. Please try again.'),
    onSettled: () => setBuyingProductId('')
  });

  const welcomeSpinMutation = useMutation({
    mutationFn: claimWelcomeSpin,
    onSuccess: async (result) => {
      toast.success(result.message || 'Welcome reward claimed successfully');
      const rewardData = result.data || {};
      queryClient.setQueryData(queryKeys.wallet, (current) => {
        if (!current) return current;
        const currentWallet = current.wallet || {};
        const nextAuctionBonusBalance = Number(rewardData.auctionBonusBalance ?? currentWallet.auction_bonus_balance ?? currentWallet.auction_bonus_wallet_balance ?? 0);
        const nextAuctionSpendableBalance = Number(currentWallet.balance ?? 0) + nextAuctionBonusBalance;
        return {
          ...current,
          wallet: {
            ...currentWallet,
            auction_bonus_balance: nextAuctionBonusBalance,
            auction_bonus_wallet_balance: nextAuctionBonusBalance,
            auction_spendable_balance: nextAuctionSpendableBalance,
            auction_spendable_wallet_balance: nextAuctionSpendableBalance
          }
        };
      });
      queryClient.setQueryData(queryKeys.welcomeSpinStatus, {
        data: {
          eligible: false,
          claimed: true,
          claimedAt: new Date().toISOString(),
          rewardAmount: Number(rewardData.rewardAmount || 0)
        },
        message: result.message || 'Welcome reward claimed successfully'
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.me }),
        queryClient.invalidateQueries({ queryKey: queryKeys.welcomeSpinStatus })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Unable to claim welcome reward')
  });

  const address = addressQuery.data?.data?.address || null;
  const products = Array.isArray(productData) ? productData : [];
  const homepageBanners = Array.isArray(bannersQuery.data) ? bannersQuery.data : [];
  const unreadNotificationCount = Number(notificationsCountQuery.data?.unreadCount || 0);
  const welcomeSpinStatus = welcomeSpinQuery.data?.data || null;
  const auctionBonusBalance = Number(walletQuery.data?.wallet?.auction_bonus_balance ?? walletQuery.data?.wallet?.auction_bonus_wallet_balance ?? 0);
  const availableWalletBalance = Number(walletQuery.data?.wallet?.balance || 0);
  const pendingPayableAmount = pendingPurchase ? getProductPricing(pendingPurchase, 1).lineFinalTotal : 0;
  const pendingCanAfford = pendingPurchase ? hasSufficientWalletBalance(walletQuery.data, pendingPayableAmount) : true;

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

  useEffect(() => {
    setActiveBannerIndex(0);
    const track = bannerTrackRef.current;
    if (track) track.scrollTo({ left: 0, behavior: 'auto' });
  }, [slides.length]);

  useEffect(() => {
    if (welcomeSpinStatus?.eligible && !welcomeSpinStatus?.claimed) {
      setWelcomeSpinOpen(true);
      return;
    }
    if (welcomeSpinStatus?.claimed) {
      setWelcomeSpinOpen(false);
    }
  }, [welcomeSpinStatus]);

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

  return (
    <>
      <div className="-mx-4 min-h-full bg-[#202127] px-4 pb-24 pt-1.5 sm:mx-0 sm:rounded-[32px] sm:border sm:border-slate-200 sm:px-5 sm:py-3">
        <div className="mx-auto max-w-xl space-y-3">
        <section className="px-1 pt-1">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push('/profile/address')}
              className="min-w-0 text-left"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">My Location</p>
              <div className="mt-0.5 flex items-center gap-1">
                <h1 className="truncate text-[15px] font-semibold tracking-[-0.03em] text-slate-900">{buildLocationLabel(address)}</h1>
                <ChevronRight size={13} className="shrink-0 text-slate-400" />
              </div>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">{addressQuery.isError && !address ? 'Unable to load address' : buildLocationDetail(address)}</p>
            </button>

            <div className="flex items-center gap-2">
              <CartPill />
              <button
                type="button"
                onClick={() => router.push('/notifications')}
                aria-label="Notifications"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
              >
                <Bell size={15} />
                {unreadNotificationCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                ) : null}
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

        <section className="space-y-0.5">
          <div
            ref={bannerTrackRef}
            onScroll={(event) => {
              const width = event.currentTarget.clientWidth || 1;
              const index = Math.round(event.currentTarget.scrollLeft / width);
              if (index !== activeBannerIndex) setActiveBannerIndex(index);
            }}
            className="flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth pb-0"
          >
            {slides.map((banner) => (
              <div key={banner.id} className="min-w-full snap-start">
                {banner.imageUrl ? (
                  <Link href={resolveBannerTarget(banner.targetLink)} className="relative block h-[124px] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_10px_20px_rgba(15,23,42,0.08)]">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title || 'Homepage banner'}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#111217]/85 via-[#111217]/40 to-transparent p-2.5 text-white">
                      <div className="max-w-[72%]">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/75">Hope Marketplace</p>
                        <h2 className="mt-1 text-[15px] font-semibold leading-4">{banner.title}</h2>
                        {banner.subtitle ? <p className="mt-1 line-clamp-2 text-[10px] leading-3.5 text-white/90">{banner.subtitle}</p> : null}
                        {banner.ctaText ? <span className="mt-2 inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-semibold text-white">{banner.ctaText}</span> : null}
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
            <div className="flex items-center justify-center gap-0.5">
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
                  className={`rounded-[20px] border px-2 py-3 text-center shadow-[0_8px_18px_rgba(15,23,42,0.04)] ${action.featured ? 'border-[rgba(139,61,255,0.34)] bg-[rgba(61,48,88,0.72)]' : 'border-slate-200 bg-[#2a2c34]'}`}
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

          {!productsPending && !productsError && !popularProducts.length ? (
            <EmptyState title="No products yet" description="Products will appear here as soon as they are available." />
          ) : null}

          {!productsPending && !productsError && popularProducts.length ? (
            <div className="grid grid-cols-2 gap-3">
              {popularProducts.map((product) => {
                const lineTotal = getProductPricing(product, 1).lineFinalTotal;
                const lowBalance = !walletQuery.isError && !walletQuery.isLoading && !hasSufficientWalletBalance(walletQuery.data, lineTotal);

                return (
                  <ProductTile
                    key={product.id}
                    product={product}
                    onBuy={(item) => {
                      if (!address?.id) {
                        toast.error('Add a delivery address before payment');
                        router.push('/profile/address');
                        return;
                      }
                      setPendingPurchase(item);
                    }}
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

      <WelcomeSpinModal
        open={welcomeSpinOpen}
        status={welcomeSpinStatus}
        claimPending={welcomeSpinMutation.isPending}
        auctionBonusBalance={auctionBonusBalance}
        onClaim={async () => {
          const result = await welcomeSpinMutation.mutateAsync();
          return result.data || null;
        }}
        onClose={() => {
          if (welcomeSpinStatus?.claimed) {
            setWelcomeSpinOpen(false);
          }
        }}
        onGoToAuctions={() => {
          if (welcomeSpinStatus?.claimed) {
            setWelcomeSpinOpen(false);
            router.push('/auctions');
          }
        }}
      />
      <PurchaseConfirmModal
        open={Boolean(pendingPurchase)}
        product={pendingPurchase}
        deliveryAddress={address}
        paymentSourceLabel="Deposit Wallet"
        availableBalance={availableWalletBalance}
        payableAmount={pendingPayableAmount}
        canAfford={pendingCanAfford}
        loading={buyMutation.isPending}
        onClose={() => {
          if (!buyMutation.isPending) setPendingPurchase(null);
        }}
        onConfirm={() => {
          if (!pendingPurchase || buyMutation.isPending) return;
          buyMutation.mutate(pendingPurchase);
        }}
      />
    </>
  );
}
