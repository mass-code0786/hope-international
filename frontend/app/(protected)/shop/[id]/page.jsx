'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  Headset,
  Heart,
  ImageOff,
  Share2,
  ShieldCheck,
  Star,
  Truck,
  Wallet
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { PurchaseConfirmModal } from '@/components/shop/PurchaseConfirmModal';
import { useProducts } from '@/hooks/useProducts';
import { useWallet } from '@/hooks/useWallet';
import { currency, number } from '@/lib/utils/format';
import { createOrder } from '@/lib/services/ordersService';
import { queryKeys } from '@/lib/query/queryKeys';
import { addToCart } from '@/lib/utils/cart';
import { getOfferPercent, getProductPricing } from '@/lib/utils/pricing';
import { getAvailableWalletBalance, hasSufficientWalletBalance } from '@/lib/utils/wallet';

function getRating(product) {
  const base = String(product?.id || product?.name || 'hope').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (4 + ((base % 9) / 10)).toFixed(1);
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
  const themes = ['from-[#eef7ff] to-[#dbeafe]', 'from-[#fff7ed] to-[#fed7aa]', 'from-[#ecfeff] to-[#ccfbf1]', 'from-[#f5f3ff] to-[#ddd6fe]'];
  const index = String(seed || 'hope').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return themes[index % themes.length];
}

function getProductImages(product) {
  const gallery = Array.isArray(product?.gallery) ? product.gallery.filter(Boolean) : [];
  const primary = product?.image_url || gallery[0] || '';
  const rest = gallery.filter((item) => item !== primary);
  return primary ? [primary, ...rest] : [];
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const { data, isLoading, isError, refetch } = useProducts();
  const walletQuery = useWallet();
  const [isBuying, setIsBuying] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const products = Array.isArray(data) ? data : [];
  const product = useMemo(() => products.find((item) => String(item?.id) === id), [products, id]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const category = getCategory(product);
    return products
      .filter((item) => String(item?.id) !== id)
      .sort((a, b) => (getCategory(b) === category ? 1 : 0) - (getCategory(a) === category ? 1 : 0))
      .slice(0, 8);
  }, [products, product, id]);

  const pricing = getProductPricing(product, 1);
  const walletBalance = getAvailableWalletBalance(walletQuery.data);
  const canAfford = hasSufficientWalletBalance(walletQuery.data, pricing.lineFinalTotal);
  const walletReady = !walletQuery.isLoading && !walletQuery.isError;

  const buyMutation = useMutation({
    mutationFn: (selected) => {
      const total = getProductPricing(selected, 1).lineFinalTotal;
      if (!hasSufficientWalletBalance(walletQuery.data, total)) {
        throw new Error('Insufficient wallet balance');
      }
      return createOrder({
        chargeWallet: true,
        paymentSource: 'deposit_wallet',
        items: [{ productId: selected.id, quantity: 1 }]
      });
    },
    onMutate: () => setIsBuying(true),
    onSuccess: async () => {
      toast.success('Order placed successfully. Dashboard is updating.');
      setPurchaseModalOpen(false);
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
    return <div className="space-y-3"><LoadingSkeleton className="h-10 w-full" /><LoadingSkeleton className="h-64" /><LoadingSkeleton className="h-44" /></div>;
  }

  if (isError) return <ErrorState message="Product could not be loaded." onRetry={refetch} />;
  if (!product) return <EmptyState title="Product not found" description="This product may have been removed from the catalog." />;

  const offerPercent = getOfferPercent(product);
  const category = getCategory(product);
  const rating = getRating(product);
  const imageTheme = buildImageTheme(product.id || product.name);
  const images = getProductImages(product);
  const highlights = ['Verified marketplace product', 'Fast dispatch and tracked support', product.is_qualifying ? 'Qualifying item for network benefits' : 'Trusted and quality-checked item'];

  return (
    <div className="-mx-4 space-y-3 bg-[#f8fafc] px-3 pb-28 pt-0 sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-200 sm:px-4 sm:py-3 sm:pb-24">
      <section className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <Link href="/shop" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"><ArrowLeft size={14} /></Link>
          <p className="truncate text-[12px] font-semibold text-slate-900">Product Details</p>
          <div className="flex items-center gap-1">
            <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700" aria-label="Wishlist"><Heart size={14} /></button>
            <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700" aria-label="Share"><Share2 size={14} /></button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <div className={`relative h-56 bg-gradient-to-br ${imageTheme}`}>
          <span className="absolute left-2 top-2 z-10 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">-{offerPercent}%</span>
          <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"><Star size={10} className="fill-amber-400 text-amber-400" />{rating}</span>
          {images[0] ? <img src={images[0]} alt={product.name || 'Product'} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate-500"><ImageOff size={28} /></div>}
        </div>
        <div className="grid grid-cols-4 gap-1.5 border-t border-slate-100 p-2">
          {(images.length ? images.slice(0, 4) : [null, null, null, null]).map((src, index) => src ? <img key={`${src}-${index}`} src={src} alt={`${product.name || 'Product'} ${index + 1}`} className="h-12 w-full rounded-md border border-slate-200 object-cover" /> : <div key={index} className={`flex h-12 items-center justify-center rounded-md border border-white/60 bg-gradient-to-br ${buildImageTheme(`${product.id}-${index}`)} text-slate-500`}><ImageOff size={12} /></div>)}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{category}</p>
        <h1 className="mt-1 text-[16px] font-semibold leading-5 text-slate-900">{product.name || 'Unnamed Product'}</h1>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-[20px] font-bold text-slate-900">{currency(pricing.finalPrice)}</p>
          {pricing.compareAtPrice > 0 ? <p className="text-[12px] text-slate-400 line-through">{currency(pricing.compareAtPrice)}</p> : null}
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Save {offerPercent}%</span>
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
          <p className="inline-flex items-center gap-1 font-semibold text-slate-800"><Wallet size={12} /> Wallet Balance: {currency(walletBalance)}</p>
          {walletReady && !canAfford ? <p className="mt-1 text-rose-600">Insufficient wallet balance</p> : null}
        </div>
        <ul className="mt-3 space-y-1 text-[11px] text-slate-700">
          {highlights.map((item) => <li key={item} className="inline-flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600" />{item}</li>)}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h2 className="text-[13px] font-semibold text-slate-900">Description</h2>
        <p className="mt-1.5 text-[12px] leading-5 text-slate-600">{product.description || 'Premium catalog product from Hope International marketplace.'}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h2 className="text-[13px] font-semibold text-slate-900">Specifications & Details</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-slate-500">PV</p><p className="font-semibold text-slate-900">{number(product.pv)}</p></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-slate-500">BV</p><p className="font-semibold text-slate-900">{number(product.bv)}</p></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-slate-500">SKU</p><p className="font-semibold text-slate-900">{product.sku || `HOP-${String(product.id).slice(0, 8)}`}</p></div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2"><p className="text-slate-500">Qualifying</p><p className="font-semibold text-slate-900">{product.is_qualifying ? 'Yes' : 'No'}</p></div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <article className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"><p className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500"><BadgePercent size={11} /> Offer Info</p><p className="mt-1 text-[11px] text-slate-700">Current offer: {offerPercent}% off</p><p className="mt-0.5 text-[11px] text-slate-700">MRP: {pricing.compareAtPrice > 0 ? currency(pricing.compareAtPrice) : currency(pricing.finalPrice)}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"><p className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500"><Truck size={11} /> Delivery</p><p className="mt-1 text-[11px] text-slate-700">Fast shipping support</p><p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-700"><Headset size={11} /> Assisted support</p></article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h2 className="text-[13px] font-semibold text-slate-900">Seller / Source Info</h2>
        <p className="mt-1 text-[11px] text-slate-600">Hope Verified Merchant Network</p>
        <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700"><ShieldCheck size={11} /> Verified supply and catalog quality control</p>
      </section>

      {relatedProducts.length ? <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"><h2 className="text-[13px] font-semibold text-slate-900">Related Products</h2><div className="mt-2 grid grid-cols-2 gap-2">{relatedProducts.map((item) => { const itemOffer = getOfferPercent(item); const itemPricing = getProductPricing(item, 1); const itemCover = item.image_url || item.gallery?.[0] || ''; return <Link key={item.id} href={`/shop/${encodeURIComponent(String(item.id))}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">{itemCover ? <img src={itemCover} alt={item.name || 'Product'} className="h-20 w-full object-cover" /> : <div className={`flex h-20 items-center justify-center bg-gradient-to-br ${buildImageTheme(item.id || item.name)} text-slate-500`}><ImageOff size={16} /></div>}<div className="space-y-1 p-2"><p className="line-clamp-2 text-[10px] font-medium text-slate-800">{item.name || 'Product'}</p><div className="flex items-center gap-1"><p className="text-[11px] font-bold text-slate-900">{currency(itemPricing.finalPrice)}</p><p className="text-[9px] text-emerald-700">-{itemOffer}%</p></div></div></Link>; })}</div></section> : null}

      <section className="fixed bottom-12 left-0 right-0 z-30 border-t border-slate-200 bg-white p-2 md:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
          <button onClick={() => { const nextCount = addToCart(product, 1); if (!nextCount) { toast.error('Unable to add this product to cart'); return; } toast.success(`Added to cart (${nextCount})`); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700">Add to Cart</button>
          <button onClick={() => setPurchaseModalOpen(true)} disabled={isBuying || (walletReady && !canAfford)} className="rounded-lg bg-[#0ea5e9] px-3 py-2 text-[12px] font-semibold text-white disabled:bg-slate-300 disabled:opacity-100">{isBuying ? 'Processing...' : walletReady && !canAfford ? 'Low Balance' : 'Buy Now'}</button>
        </div>
      </section>

      <PurchaseConfirmModal
        open={purchaseModalOpen}
        product={product}
        paymentSourceLabel="Deposit Wallet"
        availableBalance={walletBalance}
        payableAmount={pricing.lineFinalTotal}
        canAfford={canAfford}
        loading={buyMutation.isPending}
        onClose={() => {
          if (!buyMutation.isPending) setPurchaseModalOpen(false);
        }}
        onConfirm={() => {
          if (buyMutation.isPending) return;
          buyMutation.mutate(product);
        }}
      />
    </div>
  );
}
