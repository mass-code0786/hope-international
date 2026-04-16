'use client';

import Link from 'next/link';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SellerStatusBadge } from '@/components/seller/SellerStatusBadge';
import { SellerGuard } from '@/components/seller/SellerGuard';
import { useSellerMe } from '@/hooks/useSellerMe';
import { shortDate } from '@/lib/utils/format';

function SellerProfileContent() {
  const sellerQuery = useSellerMe();

  if (sellerQuery.isLoading) return null;
  if (sellerQuery.isError) return <ErrorState message="Seller profile could not be loaded." onRetry={sellerQuery.refetch} />;

  const profile = sellerQuery.data?.profile;
  const documents = sellerQuery.data?.documents || [];

  if (!profile) {
    return (
      <EmptyState
        title="No seller profile found"
        description="Complete your seller application to create your seller profile."
        action={<Link href="/seller/apply" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black">Apply Now</Link>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Seller Profile" subtitle="Business identity, KYC records, and seller application details." eyebrow="Seller" />

      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted">Application Status</p>
          <p className="text-base font-semibold text-text">{profile.business_name}</p>
        </div>
        <SellerStatusBadge status={profile.application_status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="Legal Name" value={profile.legal_name || '-'} />
        <StatCard title="Business Type" value={profile.business_type || '-'} />
        <StatCard title="Phone" value={profile.phone || '-'} />
        <StatCard title="Email" value={profile.email || profile.user_email || '-'} />
        <StatCard title="Tax ID" value={profile.tax_id || '-'} />
        <StatCard title="Reviewed At" value={shortDate(profile.reviewed_at)} />
      </div>

      <div className="card-surface p-4">
        <p className="text-sm font-semibold text-text">Business Address</p>
        <p className="mt-2 text-sm text-muted">
          {[profile.address_line1, profile.address_line2, profile.city, profile.state, profile.country, profile.postal_code]
            .filter(Boolean)
            .join(', ') || 'Address not submitted'}
        </p>
      </div>

      <div className="card-surface p-4">
        <p className="text-sm font-semibold text-text">KYC Documents</p>
        {!documents.length ? (
          <p className="mt-2 text-sm text-muted">No document records available.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-xl border border-white/10 bg-cardSoft p-3">
                <p className="text-sm font-semibold text-text">{doc.document_type}</p>
                <p className="text-xs text-muted">Number: {doc.document_number || '-'}</p>
                <a href={doc.document_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-accent">
                  View Document
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SellerProfilePage() {
  return (
    <SellerGuard>
      <SellerProfileContent />
    </SellerGuard>
  );
}
