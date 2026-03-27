'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Menu, Search, ShoppingCart, UserCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProductFilters } from '@/components/shop/ProductFilters';
import { ProductCard } from '@/components/shop/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ShopSkeleton } from '@/components/ui/PageSkeletons';
import { LogoMark } from '@/components/brand/HopeLogo';
import { useProducts } from '@/hooks/useProducts';
import { createOrder } from '@/lib/services/ordersService';
import { queryKeys } from '@/lib/query/queryKeys';
import { subscribeCart } from '@/lib/utils/cart';

function SectionTitle({ title, subtitle, count }) {
  return (
    <div className="mb-3.5 flex items-end justify-between gap-3">
      <div>
        <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">{count}</span>
    </div>
  );
}

export default function ShopPage() {
  const { data, isLoading, isError, refetch } = useProducts();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [buyingProductId, setBuyingProductId] = useState('');
  const [cartCount, setCartCount] = useState(0);
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

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const text = `${product?.name || ''} ${product?.description || ''}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      if (activeCategory === 'All') return matchesSearch;
      return matchesSearch && text.includes(activeCategory.toLowerCase());
    });
  }, [products, search, activeCategory]);

  const { featured, deals, recommended } = useMemo(() => {
    const featuredList = filtered.slice(0, 4);
    const featuredIds = new Set(featuredList.map((item) => item.id));

    const dealList = filtered.filter((item) => item.is_qualifying && !featuredIds.has(item.id)).slice(0, 4);
    const dealIds = new Set(dealList.map((item) => item.id));

    const recommendedList = filtered.filter((item) => !featuredIds.has(item.id) && !dealIds.has(item.id));

    return {
      featured: featuredList,
      deals: dealList,
      recommended: recommendedList
    };
  }, [filtered]);

  const hasProducts = !isLoading && !isError && filtered.length > 0;

  return (
    <div className="-mx-4 space-y-5 bg-gradient-to-b from-[#f8f6f2] via-[#f8f7f5] to-[#f4f4f2] px-4 pb-3 pt-2 sm:mx-0 sm:rounded-3xl sm:border sm:border-slate-200 sm:px-5 sm:py-5">
      <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-2.5 text-[11px] font-medium text-amber-100 shadow-[0_10px_26px_rgba(15,23,42,0.18)]">
        Free shipping on orders above {`$`}150 | New drops every Friday
      </div>

      <section className="space-y-3.5 rounded-3xl border border-slate-200/95 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.07)]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-[0_6px_16px_rgba(217,119,6,0.12)]">
              <LogoMark size={26} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Hope International</p>
              <p className="truncate text-[13px] font-semibold text-slate-900">Premium Marketplace</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-[0_8px_16px_rgba(15,23,42,0.05)]">
              <ShoppingCart size={17} />
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            </button>
            <Link href="/profile" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-[0_8px_16px_rgba(15,23,42,0.05)]">
              <UserCircle2 size={17} />
            </Link>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-[0_8px_16px_rgba(15,23,42,0.05)]">
              <Menu size={17} />
            </button>
          </div>
        </div>

        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search curated products"
            className="w-full rounded-2xl border border-slate-200 bg-gradient-to-b from-[#f8fafc] to-white py-3.5 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-100"
          />
        </label>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-amber-200/30 bg-gradient-to-br from-[#0b1528] via-[#1a2a45] to-[#37475f] p-5 text-white shadow-[0_24px_50px_rgba(15,23,42,0.28)]">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/25 blur-2xl" />
        <div className="absolute -bottom-14 left-16 h-36 w-36 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="absolute right-5 top-5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100 backdrop-blur">
          Limited Drop
        </div>
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">Exclusive Collection</p>
          <h2 className="mt-2.5 max-w-xs text-[27px] font-semibold leading-[1.16] tracking-[-0.02em]">Discover premium essentials for modern lifestyle</h2>
          <p className="mt-2.5 max-w-sm text-xs leading-5 text-slate-200/95">Carefully selected products with high value, fast checkout, and trusted delivery.</p>
          <div className="mt-5 flex items-center gap-2.5">
            <button className="rounded-full bg-gradient-to-r from-amber-300 to-orange-300 px-4 py-2 text-xs font-semibold text-slate-900 shadow-[0_12px_24px_rgba(217,119,6,0.35)]">
              Shop New Arrivals
            </button>
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-slate-100">Trusted by premium buyers</span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-[#fcfcfb] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <ProductFilters
          search={search}
          setSearch={setSearch}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
        />
      </section>

      {isLoading ? <ShopSkeleton /> : null}
      {isError ? <ErrorState message="Products could not be loaded. Please check your connection and retry." onRetry={refetch} /> : null}

      {!isLoading && !isError && filtered.length === 0 ? (
        <EmptyState title="No matching products" description="Try different keywords or switch categories to discover more offers." />
      ) : null}

      {hasProducts ? (
        <section className="space-y-7 pt-1">
          <div>
            <SectionTitle title="Featured For You" subtitle="Handpicked premium products" count={featured.length} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onBuy={(p) => buyMutation.mutate(p)}
                  isBuying={buyMutation.isPending && buyingProductId === product.id}
                  disableBuying={false}
                />
              ))}
            </div>
          </div>

          {deals.length ? (
            <div>
              <SectionTitle title="Today's Deals" subtitle="Qualifying picks with stronger value" count={deals.length} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {deals.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onBuy={(p) => buyMutation.mutate(p)}
                    isBuying={buyMutation.isPending && buyingProductId === product.id}
                    disableBuying={false}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {recommended.length ? (
            <div>
              <SectionTitle title="Recommended" subtitle="More from the Hope catalog" count={recommended.length} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onBuy={(p) => buyMutation.mutate(p)}
                    isBuying={buyMutation.isPending && buyingProductId === product.id}
                    disableBuying={false}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
