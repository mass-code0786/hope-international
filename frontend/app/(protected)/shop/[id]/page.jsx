'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, ShieldCheck, Star } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useProducts } from '@/hooks/useProducts';
import { currency, number } from '@/lib/utils/format';
import { createOrder } from '@/lib/services/ordersService';
import { queryKeys } from '@/lib/query/queryKeys';
import { addToCart } from '@/lib/utils/cart';

function getOfferPercent(product) {
  const base = String(product?.id || product?.name || 'hope')
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return 10 + (base % 26);
}

function getCategory(product) {
  const text = `${product?.name || ''} ${product?.description || ''}`.toLowerCase();
  if (text.includes('health') || text.includes('wellness')) return 'Health';
  if (text.includes('beauty') || text.includes('skin')) return 'Beauty';
  if (text.includes('course') || text.includes('digital')) return 'Digital';
  if (text.includes('kit') || text.includes('pack')) return 'Physical';
  return product?.is_qualifying ? 'Featured' : 'General';
}

function buildImageTheme(seed) {
  const themes = [
    'from-[#eef7ff] to-[#dbeafe]',
    'from-[#fff7ed] to-[#fed7aa]',
    'from-[#ecfeff] to-[#ccfbf1]',
    'from-[#f5f3ff] to-[#ddd6fe]'
  ];

  const index = String(seed || 'hope')
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return themes[index % themes.length];
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const { data, isLoading, isError, refetch } = useProducts();
  const [isBuying, setIsBuying] = useState(false);
  const queryClient = useQueryClient();

  const products = Array.isArray(data) ? data : [];

  const product = useMemo(() => {
    return products.find((item) => String(item?.id) === id);
  }, [products, id]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const category = getCategory(product);

    return products
      .filter((item) => String(item?.id) !== id)
      .sort((a, b) => {
        const scoreA = getCategory(a) === category ? 1 : 0;
        const scoreB = getCategory(b) === category ? 1 : 0;
        return scoreB - scoreA;
      })
      .slice(0, 6);
  }, [products, product, id]);

  const buyMutation = useMutation({
    mutationFn: (selected) => createOrder({ items: [{ productId: selected.id, quantity: 1 }] }),
    onMutate: () => setIsBuying(true),
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
    onSettled: () => setIsBuying(false)
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton className="h-8 w-28" />
        <LoadingSkeleton className="h-52" />
        <LoadingSkeleton className="h-44" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Product could not be loaded." onRetry={refetch} />;
  }

  if (!product) {
    return <EmptyState title="Product not found" description="This product may have been removed from the catalog." />;
  }

  const offerPercent = getOfferPercent(product);
  const currentPrice = Number(product?.price || 0);
  const oldPrice = currentPrice > 0 ? currentPrice * (1 + offerPercent / 100) : 0;
  const category = getCategory(product);
  const imageTheme = buildImageTheme(product.id || product.name);

  return (
    <div className="-mx-4 space-y-3 bg-[#f5f5f5] px-3 pb-28 pt-1 sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-200 sm:px-4 sm:py-3 sm:pb-24">
      <Link href="/shop" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700">
        <ArrowLeft size={14} />
        Back to shop
      </Link>

      <section className={`rounded-xl border border-slate-200 bg-gradient-to-br ${imageTheme} p-3`}>
        <div className="flex items-center justify-between">
          <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">-{offerPercent}% OFF</span>
          <span className="inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
            <Star size={10} className="fill-amber-400 text-amber-400" />
            4.6
          </span>
        </div>
        <div className="mt-2.5 h-36 rounded-lg border border-white/70 bg-white/60" />
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          <div className="h-10 rounded-md border border-white/70 bg-white/70" />
          <div className="h-10 rounded-md border border-white/70 bg-white/70" />
          <div className="h-10 rounded-md border border-white/70 bg-white/70" />
          <div className="h-10 rounded-md border border-white/70 bg-white/70" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h1 className="text-[16px] font-semibold text-slate-900">{product.name || 'Unnamed Product'}</h1>
        <p className="mt-1 text-[11px] text-slate-500">Category: {category}</p>

        <div className="mt-2 flex items-center gap-2">
          <p className="text-[18px] font-bold text-slate-900">{currency(currentPrice)}</p>
          {oldPrice > 0 ? <p className="text-[11px] text-slate-400 line-through">{currency(oldPrice)}</p> : null}
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Save {offerPercent}%</span>
        </div>

        <ul className="mt-3 space-y-1 text-[11px] text-slate-700">
          <li className="inline-flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600" /> Verified marketplace item</li>
          <li className="inline-flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600" /> Fast dispatch support</li>
          <li className="inline-flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600" /> Secure checkout and tracking</li>
        </ul>

        <p className="mt-3 text-[12px] leading-5 text-slate-600">
          {product.description || 'Premium catalog product from Hope International marketplace.'}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h2 className="text-[13px] font-semibold text-slate-900">Specifications & Details</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-slate-500">PV</p>
            <p className="font-semibold text-slate-900">{number(product.pv)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-slate-500">BV</p>
            <p className="font-semibold text-slate-900">{number(product.bv)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-slate-500">Qualifying</p>
            <p className="font-semibold text-slate-900">{product.is_qualifying ? 'Yes' : 'No'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-slate-500">SKU</p>
            <p className="font-semibold text-slate-900">HOP-{String(product.id).slice(0, 8)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h2 className="text-[13px] font-semibold text-slate-900">Seller / Source Info</h2>
        <p className="mt-1 text-[11px] text-slate-600">Source: Hope Verified Merchant Network</p>
        <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
          <ShieldCheck size={11} />
          Verified supply and catalog control
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h2 className="text-[13px] font-semibold text-slate-900">Pricing & Offer Info</h2>
        <ul className="mt-1 space-y-1 text-[11px] text-slate-600">
          <li>Current price: {currency(currentPrice)}</li>
          <li>Reference MRP: {oldPrice > 0 ? currency(oldPrice) : currency(currentPrice)}</li>
          <li>Current promotion: {offerPercent}% off</li>
          <li>Offer validity: Limited-time marketplace campaign</li>
        </ul>
      </section>

      {relatedProducts.length ? (
        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <h2 className="text-[13px] font-semibold text-slate-900">Related Products</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {relatedProducts.map((item) => (
              <Link key={item.id} href={`/shop/${encodeURIComponent(String(item.id))}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className={`h-12 rounded-md bg-gradient-to-br ${buildImageTheme(item.id || item.name)}`} />
                <p className="mt-1 line-clamp-2 text-[10px] font-medium text-slate-800">{item.name || 'Product'}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-900">{currency(item.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="fixed bottom-12 left-0 right-0 z-30 border-t border-slate-200 bg-white p-2 md:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
          <button
            onClick={() => {
              const nextCount = addToCart(product, 1);
              if (!nextCount) {
                toast.error('Unable to add this product to cart');
                return;
              }
              toast.success(`Added to cart (${nextCount})`);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700"
          >
            Add to Cart
          </button>
          <button
            onClick={() => buyMutation.mutate(product)}
            disabled={isBuying}
            className="rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            {isBuying ? 'Processing...' : 'Buy Now'}
          </button>
        </div>
      </section>
    </div>
  );
}
