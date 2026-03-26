'use client';

import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { currency, number } from '@/lib/utils/format';
import { addToCart } from '@/lib/utils/cart';

export function ProductCard({ product, onBuy, isBuying = false, disableBuying = false }) {
  const safeProduct = product || {};

  return (
    <div className="card-surface p-4">
      <div className="mb-3 h-36 rounded-xl bg-gradient-to-br from-cardSoft to-black" />
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 text-sm font-semibold text-text">{safeProduct.name || 'Unnamed Product'}</h3>
        {safeProduct.is_qualifying ? <Badge variant="success">Qualifying</Badge> : <Badge>Standard</Badge>}
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted">{safeProduct.description || 'Premium product from Hope International catalog.'}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
        <div>
          <p>Price</p>
          <p className="font-semibold text-text">{currency(safeProduct.price)}</p>
        </div>
        <div>
          <p>BV</p>
          <p className="font-semibold text-text">{number(safeProduct.bv)}</p>
        </div>
        <div>
          <p>PV</p>
          <p className="font-semibold text-text">{number(safeProduct.pv)}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          disabled={isBuying || disableBuying}
          onClick={() => onBuy?.(safeProduct)}
          className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {disableBuying ? 'Disabled in Demo' : isBuying ? 'Processing...' : 'Buy Now'}
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
          className="rounded-xl border border-white/10 px-3 py-2 text-xs text-muted"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
