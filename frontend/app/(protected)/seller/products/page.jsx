'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SellerStatusBadge } from '@/components/seller/SellerStatusBadge';
import { SellerGuard } from '@/components/seller/SellerGuard';
import { useSellerProducts } from '@/hooks/useSellerProducts';
import { currency, number, shortDate } from '@/lib/utils/format';

function SellerProductsContent() {
  const { products, isLoading, isError, refetch } = useSellerProducts();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const text = search.toLowerCase();
    return products.filter((product) => {
      const haystack = `${product?.name || ''} ${product?.sku || ''} ${product?.description || ''}`.toLowerCase();
      return haystack.includes(text);
    });
  }, [products, search]);

  if (isLoading) return null;
  if (isError) return <ErrorState message="Seller products could not be loaded." onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <SectionHeader title="Seller Products" subtitle="Create, monitor, and revise products based on moderation feedback." eyebrow="Seller" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          className="w-full rounded-xl border border-white/10 bg-card p-3 text-sm md:max-w-md"
          placeholder="Search by name, SKU, description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Link href="/seller/products/new" className="inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black">
          Create Product
        </Link>
      </div>

      {!filtered.length ? (
        <EmptyState
          title="No products found"
          description="No seller products match the current filter."
          action={
            <Link href="/seller/products/new" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black">
              Create First Product
            </Link>
          }
        />
      ) : null}

      <div className="space-y-3">
        {filtered.map((product) => (
          <div key={product.id} className="card-surface space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-text">{product.name}</p>
                <p className="text-xs text-muted">SKU: {product.sku} | Updated: {shortDate(product.updated_at || product.created_at)}</p>
              </div>
              <SellerStatusBadge status={product.moderation_status} kind="moderation" />
            </div>

            <div className="grid gap-3 text-sm text-muted md:grid-cols-4">
              <p>Price: <span className="text-text">{currency(product.price)}</span></p>
              <p>BV: <span className="text-text">{number(product.bv)}</span></p>
              <p>PV: <span className="text-text">{number(product.pv)}</span></p>
              <p>Qualifying: <span className="text-text">{product.is_qualifying ? 'Yes' : 'No'}</span></p>
            </div>

            {product.moderation_notes ? (
              <div className="rounded-xl border border-white/10 bg-cardSoft p-3 text-sm text-muted">
                <p className="text-xs uppercase tracking-wide text-muted">Moderation Notes</p>
                <p className="mt-1 text-text">{product.moderation_notes}</p>
              </div>
            ) : null}

            {(product.moderation_status === 'pending' || product.moderation_status === 'rejected') ? (
              <div className="rounded-xl border border-accent/20 bg-accent/10 p-3 text-sm text-accentSoft">
                {product.moderation_status === 'pending'
                  ? 'This product is under moderation and not live yet.'
                  : 'This product was rejected. Update details and resubmit for review.'}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Link href={`/seller/products/${product.id}/edit`} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-text">
                Edit Product
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SellerProductsPage() {
  return (
    <SellerGuard>
      <SellerProductsContent />
    </SellerGuard>
  );
}
