'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, ImageOff, Plus, Star } from 'lucide-react';
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
  const buyNowLabel = disableBuying ? buyLabel : isBuying ? '...' : buyLabel;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(cover) && !imageFailed;

  return (
    <article className="flex h-[15rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <Link href={href} className={`relative block aspect-square w-full flex-[7] overflow-hidden bg-gradient-to-br ${imageTheme}`}>
        <span className="absolute left-1.5 top-1.5 rounded bg-emerald-500 px-1 py-0.5 text-[8px] font-semibold text-white">
          -{offerPercent}%
        </span>
        <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-0.5 rounded bg-white/90 px-1 py-0.5 text-[8px] font-medium text-slate-700">
          <Star size={9} className="fill-amber-400 text-amber-400" />
          {rating}
        </span>
        {showImage ? (
          <img
            src={cover}
            alt={safeProduct.name || 'Product'}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500">
            <ImageOff size={20} />
          </div>
        )}
      </Link>

      <div className="flex min-h-0 flex-[3] flex-col justify-between px-2.5 py-2">
        <Link href={href} className="block min-w-0">
          <h3 className="truncate text-[11px] font-semibold leading-[1.1] text-slate-900">{safeProduct.name || 'Unnamed Product'}</h3>
        </Link>

        <div className="mt-1 grid min-h-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-1">
          <div className="min-w-0">
            <p className="text-[11px] font-bold leading-none text-slate-900">{currency(pricing.finalPrice)}</p>
            <div className="mt-0.5 flex items-center gap-1">
              {pricing.compareAtPrice > 0 ? <p className="truncate text-[8px] leading-none text-slate-400 line-through">{currency(pricing.compareAtPrice)}</p> : null}
              <p className="truncate text-[8px] leading-none text-slate-500">{category}</p>
            </div>
          </div>

          <div className="grid grid-cols-[auto_auto] gap-1">
            {onBuy ? (
              <button
                type="button"
                disabled={isBuying || disableBuying}
                onClick={() => onBuy?.(safeProduct)}
                className="inline-flex h-6 min-w-[3.8rem] items-center justify-center gap-0.5 rounded-[10px] bg-[#0ea5e9] px-2 text-[9px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {buyNowLabel}
                {isBuying || disableBuying ? null : <ArrowRight size={9} />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const nextCount = addToCart(safeProduct, 1);
                if (!nextCount) {
                  toast.error('Unable to add this product to cart');
                  return;
                }
                toast.success(`Added to cart (${nextCount})`);
              }}
              className="inline-flex h-6 w-6 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#7c3aed,#22c55e)] text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition-transform hover:scale-105 active:scale-105"
              aria-label="Add to cart"
            >
              <Plus size={10} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
