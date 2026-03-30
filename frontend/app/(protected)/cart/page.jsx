'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { currency } from '@/lib/utils/format';
import { getCartItems, removeFromCart, updateCartItemQuantity } from '@/lib/utils/cart';
import { getProductPricing } from '@/lib/utils/pricing';

function readSnapshot(products = []) {
  const source = getCartItems();
  return source.map((item) => {
    const product = products.find((p) => String(p?.id) === String(item.productId));
    const quantity = Math.max(1, Number(item.quantity || 1));
    const liveProduct = product || item;
    const pricing = getProductPricing(liveProduct, quantity);
    const name = product?.name || item.name || 'Product';

    return {
      ...item,
      product,
      name,
      quantity,
      offerPercent: pricing.offerPercent,
      price: pricing.finalPrice,
      oldPrice: pricing.compareAtPrice,
      subtotal: pricing.lineFinalTotal,
      lineDiscount: pricing.lineDiscountTotal
    };
  });
}

function EmptyCart() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-600">
        <ShoppingCart size={24} />
      </div>
      <h2 className="text-[15px] font-semibold text-slate-900">Your cart is empty</h2>
      <p className="mt-1 text-[12px] text-slate-600">Add products from the shop to continue with checkout.</p>
      <Link href="/shop" className="mt-4 inline-flex rounded-lg bg-[#0ea5e9] px-4 py-2 text-[12px] font-semibold text-white">
        Continue Shopping
      </Link>
    </section>
  );
}

export default function CartPage() {
  const { data } = useProducts();
  const products = Array.isArray(data) ? data : [];
  const [items, setItems] = useState([]);

  useEffect(() => {
    const refresh = () => setItems(readSnapshot(products));
    refresh();

    const onStorage = (event) => {
      if (!event?.key || event.key === 'hope_cart_items') refresh();
    };
    const onCartUpdate = () => refresh();

    window.addEventListener('storage', onStorage);
    window.addEventListener('hope-cart-updated', onCartUpdate);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('hope-cart-updated', onCartUpdate);
    };
  }, [products]);

  const summary = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const discount = items.reduce((sum, item) => sum + Number(item.lineDiscount || 0), 0);
    const deliveryFee = subtotal > 0 ? 0 : 0;
    const total = subtotal + deliveryFee;

    return { subtotal, discount, deliveryFee, total };
  }, [items]);

  return (
    <div className="space-y-3 bg-[#f8fafc] pb-20">
      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h1 className="text-[15px] font-semibold text-slate-900">Your Cart</h1>
        <p className="mt-0.5 text-[11px] text-slate-500">Review items and continue to secure checkout</p>
      </section>

      {!items.length ? <EmptyCart /> : null}

      {items.length ? (
        <section className="space-y-2">
          {items.map((item) => (
            <article key={item.productId} className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
              <div className="grid grid-cols-[72px_1fr] gap-2.5">
                <Link href={item.productId ? `/shop/${encodeURIComponent(String(item.productId))}` : '/shop'} className="h-[72px] rounded-lg border border-slate-200 bg-gradient-to-br from-[#eef7ff] to-[#dbeafe]" />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[12px] font-semibold text-slate-900">{item.name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <p className="text-[12px] font-bold text-slate-900">{currency(item.price)}</p>
                    {item.oldPrice > 0 ? <p className="text-[10px] text-slate-400 line-through">{currency(item.oldPrice)}</p> : null}
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">-{item.offerPercent}%</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-700"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="min-w-5 text-center text-[11px] font-semibold text-slate-800">{item.quantity}</span>
                      <button
                        onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-700"
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-600"
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>

                  <p className="mt-1.5 text-right text-[11px] font-semibold text-slate-800">Subtotal: {currency(item.subtotal)}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {items.length ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <h2 className="text-[13px] font-semibold text-slate-900">Cart Summary</h2>
          <div className="mt-2 space-y-1.5 text-[12px]">
            <div className="flex items-center justify-between text-slate-600"><span>Subtotal</span><span>{currency(summary.subtotal)}</span></div>
            <div className="flex items-center justify-between text-emerald-700"><span>Discount</span><span>-{currency(summary.discount)}</span></div>
            <div className="flex items-center justify-between text-slate-600"><span>Delivery</span><span>{summary.deliveryFee ? currency(summary.deliveryFee) : 'Free'}</span></div>
            <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1.5 text-[13px] font-semibold text-slate-900"><span>Total</span><span>{currency(summary.total)}</span></div>
          </div>
          <Link href="/checkout" className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#0ea5e9] px-3 py-2 text-[12px] font-semibold text-white">
            Proceed to Checkout
          </Link>
        </section>
      ) : null}
    </div>
  );
}
