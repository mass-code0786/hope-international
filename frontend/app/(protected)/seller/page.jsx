'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SellerDashboardSkeleton } from '@/components/ui/PageSkeletons';
import { SellerStatusBadge } from '@/components/seller/SellerStatusBadge';
import { SellerGuard } from '@/components/seller/SellerGuard';
import { useSellerMe } from '@/hooks/useSellerMe';
import { shortDate } from '@/lib/utils/format';

function SellerDashboardContent() {
  const sellerQuery = useSellerMe();

  if (sellerQuery.isLoading) return <SellerDashboardSkeleton />;
  if (sellerQuery.isError) return <ErrorState message="Seller dashboard could not be loaded." onRetry={sellerQuery.refetch} />;

  const seller = sellerQuery.data || {};
  const profile = seller.profile || {};
  const summary = seller.summary || {};
  const products = Array.isArray(seller.products) ? seller.products : [];

  const latestProducts = useMemo(() => products.slice(0, 5), [products]);

  return (
    <div className="space-y-5">
      <SectionHeader title="Seller Dashboard" subtitle="Manage moderation-ready products and seller profile" />

      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted">Application Status</p>
          <p className="text-base font-semibold text-text">{profile.business_name || 'Business Profile'}</p>
        </div>
        <SellerStatusBadge status={profile.application_status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Products" value={summary.total_products || 0} />
        <StatCard title="Pending" value={summary.pending_products || 0} subtitle="Awaiting moderation" emphasis="primary" />
        <StatCard title="Approved" value={summary.approved_products || 0} subtitle="Live in catalog" emphasis="success" />
        <StatCard title="Rejected" value={summary.rejected_products || 0} subtitle="Needs revision" emphasis="default" />
        <StatCard title="Documents" value={seller.documents?.length || 0} subtitle="KYC submissions" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-text">Recent Product Submissions</p>
            <Link href="/seller/products" className="text-sm text-accent">View all</Link>
          </div>
          {latestProducts.length ? (
            <div className="space-y-2">
              {latestProducts.map((product) => (
                <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-cardSoft p-3">
                  <div>
                    <p className="text-sm font-semibold text-text">{product.name}</p>
                    <p className="text-xs text-muted">Updated {shortDate(product.updated_at || product.created_at)}</p>
                  </div>
                  <SellerStatusBadge status={product.moderation_status} kind="moderation" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No seller products yet"
              description="Create your first product submission and send it for moderation."
              action={<Link href="/seller/products/new" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black">Create Product</Link>}
            />
          )}
        </div>

        <div className="card-surface p-4">
          <p className="text-sm font-semibold text-text">Seller Orders & Payouts</p>
          <p className="mt-2 text-sm text-muted">
            Seller-specific order and payout endpoints are not available yet. This panel will activate when backend APIs are exposed.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SellerDashboardPage() {
  return (
    <SellerGuard>
      <SellerDashboardContent />
    </SellerGuard>
  );
}
