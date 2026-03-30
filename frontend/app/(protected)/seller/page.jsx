'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, Boxes, FileCheck2, Store } from 'lucide-react';
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
      <SectionHeader title="Seller Dashboard" subtitle="Manage your business profile, moderation queue, and the Hope storefront presentation from one premium workspace." />

      <div className="card-surface p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Application status</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text">{profile.business_name || 'Business Profile'}</p>
            <p className="mt-2 text-sm leading-6 text-muted">Keep your seller profile complete and your product queue review-ready for faster moderation outcomes.</p>
          </div>
          <SellerStatusBadge status={profile.application_status} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Products" value={summary.total_products || 0} right={<Boxes size={18} className="text-accent" />} />
        <StatCard title="Pending" value={summary.pending_products || 0} subtitle="Awaiting moderation" emphasis="primary" />
        <StatCard title="Approved" value={summary.approved_products || 0} subtitle="Live in catalog" emphasis="success" />
        <StatCard title="Rejected" value={summary.rejected_products || 0} subtitle="Needs revision" />
        <StatCard title="Documents" value={seller.documents?.length || 0} subtitle="KYC submissions" right={<FileCheck2 size={18} className="text-accent" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text">Recent Product Submissions</p>
              <p className="mt-1 text-xs text-muted">Latest entries in your moderation queue</p>
            </div>
            <Link href="/seller/products" className="hope-button-secondary !px-3 !py-2">View all</Link>
          </div>
          {latestProducts.length ? (
            <div className="space-y-3">
              {latestProducts.map((product) => (
                <div key={product.id} className="hope-grid-card flex flex-wrap items-center justify-between gap-3 rounded-[24px] p-3.5">
                  <div>
                    <p className="text-sm font-semibold text-text">{product.name}</p>
                    <p className="mt-1 text-xs text-muted">Updated {shortDate(product.updated_at || product.created_at)}</p>
                  </div>
                  <SellerStatusBadge status={product.moderation_status} kind="moderation" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No seller products yet" description="Create your first product submission and send it for moderation." action={<Link href="/seller/products/new" className="hope-button">Create Product</Link>} />
          )}
        </div>

        <div className="card-surface p-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent"><Store size={18} /></div>
          <p className="mt-4 text-lg font-semibold tracking-[-0.04em] text-text">Seller operations</p>
          <p className="mt-2 text-sm leading-6 text-muted">Order and payout surfaces are still limited in the current frontend, so this view focuses on application status and catalog management.</p>
          <Link href="/seller/products" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">Open product hub <ArrowRight size={15} /></Link>
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
