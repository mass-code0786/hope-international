'use client';

import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowRight, ImageOff, Plus, ShieldCheck, Star } from 'lucide-react';
import { currency } from '@/lib/utils/format';
import { addToCart } from '@/lib/utils/cart';
import { getOfferPercent, getProductPricing } from '@/lib/utils/pricing';

function getRating(product) {
  const base = String(product?.id || product?.name || 'hope')
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

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

function getProductCover(product) {
  return product?.image_url || product?.gallery?.[0] || '';
}

export function ProductCard({ product, onBuy, isBuying = false, disableBuying = false, buyLabel = 'Buy' }) {
  const safeProduct = product || {};
  const href = safeProduct?.id ? `/shop/${encodeURIComponent(String(safeProduct.id))}` : '/shop';
  const pricing = getProductPricing(safeProduct, 1);
  const offerPercent = getOfferPercent(safeProduct);
  const rating = getRating(safeProduct);
  const category = getCategory(safeProduct);
  const imageTheme = buildImageTheme(safeProduct.id || safeProduct.name);
  const cover = getProductCover(safeProduct);
  const buttonLabel = disableBuying ? buyLabel : isBuying ? '...' : buyLabel;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <Link href={href} className={`relative block h-28 bg-gradient-to-br ${imageTheme} sm:h-24`}>
        <span className="absolute left-1.5 top-1.5 rounded bg-emerald-500 px-1 py-0.5 text-[8px] font-semibold text-white">
          -{offerPercent}%
        </span>
        <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded bg-white/90 px-1 py-0.5 text-[8px] font-medium text-slate-700">
          <Star size={9} className="fill-amber-400 text-amber-400" />
          {rating}
        </span>
        {cover ? (
          <img src={cover} alt={safeProduct.name || 'Product'} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500">
            <ImageOff size={18} />
          </div>
        )}
      </Link>

      <div className="space-y-2 p-2.5">
        <Link href={href} className="block">
          <h3 className="line-clamp-2 min-h-[2.25rem] text-[11px] font-semibold leading-4 text-slate-900">{safeProduct.name || 'Unnamed Product'}</h3>
        </Link>

        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-[9px] text-slate-500">{category}</p>
          <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[8px] font-medium text-emerald-700">
            <ShieldCheck size={9} />
            {safeProduct.is_qualifying ? 'Qual' : 'Trust'}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <p className="text-[12px] font-bold text-slate-900">{currency(pricing.finalPrice)}</p>
          {pricing.compareAtPrice > 0 ? <p className="text-[8px] text-slate-400 line-through">{currency(pricing.compareAtPrice)}</p> : null}
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-1.5">
          <button
            disabled={isBuying || disableBuying}
            onClick={() => onBuy?.(safeProduct)}
            className="inline-flex min-h-[34px] items-center justify-center gap-0.5 rounded-[10px] bg-[#0ea5e9] px-1.5 py-1.5 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel}
            {isBuying || disableBuying ? null : <ArrowRight size={10} />}
          </button>
          <button
            onClick={() => {
              const nextCount = addToCart(safeProduct, 1);
              if (!nextCount) {
                toast.error('Unable to add this product to cart');
                return;
              }
              toast.success(`Added to cart (${nextCount})`);
            }}
            className="inline-flex items-center justify-center rounded-[10px] border border-slate-200 bg-[#e2e8f0] px-2 text-slate-700"
            aria-label="Add to cart"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </article>
  );
}
