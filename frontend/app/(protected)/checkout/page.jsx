'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, CreditCard, MapPin, ShieldCheck, TicketPercent, Truck } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { createOrder } from '@/lib/services/ordersService';
import { queryKeys } from '@/lib/query/queryKeys';
import { clearCart, getCartItems } from '@/lib/utils/cart';
import { currency } from '@/lib/utils/format';
import { getProductPricing } from '@/lib/utils/pricing';

function readSnapshot(products = []) {
  const source = getCartItems();
  return source.map((item) => {
    const product = products.find((p) => String(p?.id) === String(item.productId));
    const quantity = Math.max(1, Number(item.quantity || 1));
    const liveProduct = product || item;
    const pricing = getProductPricing(liveProduct, quantity);

    return {
      ...item,
      name: product?.name || item.name || 'Product',
      quantity,
      price: pricing.finalPrice,
      compareAtPrice: pricing.compareAtPrice,
      offerPercent: pricing.offerPercent,
      subtotal: pricing.lineFinalTotal,
      lineDiscount: pricing.lineDiscountTotal,
      product
    };
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useProducts();
  const products = Array.isArray(data) ? data : [];

  const [items, setItems] = useState([]);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [coupon, setCoupon] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');

  useEffect(() => {
    setItems(readSnapshot(products));
  }, [products]);

  const summary = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const discount = items.reduce((sum, item) => sum + Number(item.lineDiscount || 0), 0);
    const deliveryFee = subtotal > 0 ? 0 : 0;
    const total = subtotal + deliveryFee;
    return { subtotal, discount, deliveryFee, total };
  }, [items]);

  const orderMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      };
      return createOrder(payload);
    },
    onSuccess: async () => {
      clearCart();
      toast.success('Order placed successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.me }),
        queryClient.invalidateQueries({ queryKey: queryKeys.weeklyCompensationRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.monthlyCompensationRoot })
      ]);
      router.push('/orders');
    },
    onError: (error) => toast.error(error?.message || 'Unable to place order. Please try again.')
  });

  if (!items.length) {
    return (
      <div className="space-y-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <h1 className="text-[15px] font-semibold text-slate-900">Checkout</h1>
          <p className="mt-1 text-[12px] text-slate-600">Your cart is empty. Add products before checkout.</p>
          <Link href="/shop" className="mt-4 inline-flex rounded-lg bg-[#0ea5e9] px-4 py-2 text-[12px] font-semibold text-white">Go to Shop</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-[#f8fafc] pb-20">
      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h1 className="text-[15px] font-semibold text-slate-900">Checkout</h1>
        <p className="mt-0.5 text-[11px] text-slate-500">Secure and fast order placement</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h2 className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-900"><MapPin size={13} /> Delivery Address</h2>
        <div className="mt-2 space-y-2">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street address"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
            <input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="Postal code"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h2 className="text-[13px] font-semibold text-slate-900">Order Items</h2>
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <article key={item.productId} className="grid grid-cols-[52px_1fr_auto] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="h-[52px] rounded-md bg-gradient-to-br from-[#eef7ff] to-[#dbeafe]" />
              <div className="min-w-0">
                <p className="line-clamp-1 text-[11px] font-semibold text-slate-900">{item.name}</p>
                <p className="text-[10px] text-slate-500">Qty {item.quantity}</p>
              </div>
              <p className="text-[11px] font-semibold text-slate-900">{currency(item.subtotal)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h2 className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-900"><CreditCard size={13} /> Payment</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => setPaymentMethod('wallet')}
            className={`rounded-lg border px-2 py-2 text-[11px] font-medium ${paymentMethod === 'wallet' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Wallet
          </button>
          <button
            onClick={() => setPaymentMethod('cod')}
            className={`rounded-lg border px-2 py-2 text-[11px] font-medium ${paymentMethod === 'cod' ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Cash on Delivery
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <TicketPercent size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Coupon code"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 text-[12px] text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <button
            onClick={() => toast.success(coupon ? 'Coupon checked.' : 'Enter a coupon first.')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-700"
          >
            Apply
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
        <h2 className="text-[13px] font-semibold text-slate-900">Price Details</h2>
        <div className="mt-2 space-y-1.5 text-[12px]">
          <div className="flex items-center justify-between text-slate-600"><span>Subtotal</span><span>{currency(summary.subtotal)}</span></div>
          <div className="flex items-center justify-between text-emerald-700"><span>Discount</span><span>-{currency(summary.discount)}</span></div>
          <div className="flex items-center justify-between text-slate-600"><span>Delivery</span><span>{summary.deliveryFee ? currency(summary.deliveryFee) : 'Free'}</span></div>
          <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-1.5 text-[13px] font-semibold text-slate-900"><span>Total</span><span>{currency(summary.total)}</span></div>
        </div>
        <div className="mt-2 space-y-1 text-[10px] text-slate-500">
          <p className="inline-flex items-center gap-1"><Truck size={11} /> Fast shipping support available</p>
          <p className="inline-flex items-center gap-1"><ShieldCheck size={11} /> Secure checkout protection</p>
          <p className="inline-flex items-center gap-1"><CheckCircle2 size={11} /> Trusted marketplace order flow</p>
        </div>
      </section>

      <section className="fixed bottom-12 left-0 right-0 z-30 border-t border-slate-200 bg-white p-2 md:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto] items-center gap-2">
          <div>
            <p className="text-[10px] text-slate-500">Payable Amount</p>
            <p className="text-[14px] font-semibold text-slate-900">{currency(summary.total)}</p>
          </div>
          <button
            onClick={() => orderMutation.mutate()}
            disabled={orderMutation.isPending}
            className="rounded-lg bg-[#0ea5e9] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            {orderMutation.isPending ? 'Placing...' : 'Place Order'}
          </button>
        </div>
      </section>
    </div>
  );
}
