'use client';

import toast from 'react-hot-toast';
import { ArrowRight, ShoppingBag, Sparkles } from 'lucide-react';
import { currency, number } from '@/lib/utils/format';
import { addToCart } from '@/lib/utils/cart';

function buildCardTheme(seed) {
  const palette = [
    ['from-[#fff5e6]', 'via-[#ffe9c7]', 'to-[#ffd7a3]'],
    ['from-[#edf7ff]', 'via-[#dff0ff]', 'to-[#c8e6ff]'],
    ['from-[#f7efff]', 'via-[#efe3ff]', 'to-[#e2d0ff]'],
    ['from-[#eefbe8]', 'via-[#e0f6d8]', 'to-[#c7ecbe]']
  ];

  const value = String(seed || 'hope').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[value % palette.length];
}

function getOfferPercent(product) {
  const base = String(product?.id || product?.name || 'hope')
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return 8 + (base % 18);
}

export function ProductCard({ product, onBuy, isBuying = false, disableBuying = false }) {
  const safeProduct = product || {};
  const [from, via, to] = buildCardTheme(safeProduct.id || safeProduct.name);
  const offerPercent = getOfferPercent(safeProduct);

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition hover:-translate-y-[2px] hover:shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
      <div className={`relative h-40 bg-gradient-to-br ${from} ${via} ${to} p-4`}>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-slate-700">
          <Sparkles size={12} />
          {safeProduct.is_qualifying ? 'QUALIFYING PICK' : 'EDITOR PICK'}
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_8px_16px_rgba(244,63,94,0.35)]">
          -{offerPercent}%
        </span>
        <div className="absolute bottom-4 right-4 rounded-full border border-white/85 bg-white/90 p-2 text-slate-700 shadow-[0_8px_16px_rgba(15,23,42,0.1)]">
          <ShoppingBag size={14} />
        </div>
      </div>

      <div className="space-y-3.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{safeProduct.name || 'Unnamed Product'}</h3>
          <p className="text-[17px] font-bold tracking-[-0.01em] text-slate-900">{currency(safeProduct.price)}</p>
        </div>

        <p className="line-clamp-2 text-xs leading-5 text-slate-500">
          {safeProduct.description || 'Hope International premium product selected for high-value shoppers.'}
        </p>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-2.5 text-xs">
          <div>
            <p className="text-slate-400">BV</p>
            <p className="font-semibold text-slate-700">{number(safeProduct.bv)}</p>
          </div>
          <div>
            <p className="text-slate-400">PV</p>
            <p className="font-semibold text-slate-700">{number(safeProduct.pv)}</p>
          </div>
          <div>
            <p className="text-slate-400">Type</p>
            <p className="font-semibold text-slate-700">{safeProduct.is_qualifying ? 'Prime' : 'Core'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            disabled={isBuying || disableBuying}
            onClick={() => onBuy?.(safeProduct)}
            className="inline-flex items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 px-3 py-2.5 text-xs font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.22)] transition hover:from-slate-800 hover:to-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disableBuying ? 'Disabled in Demo' : isBuying ? 'Processing...' : 'Buy Now'}
            {isBuying ? null : <ArrowRight size={14} />}
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
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}
