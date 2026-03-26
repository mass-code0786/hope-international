'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { SellerApplySkeleton } from '@/components/ui/PageSkeletons';
import { SellerStatusBadge } from '@/components/seller/SellerStatusBadge';
import { useSellerMe } from '@/hooks/useSellerMe';
import { applyForSeller } from '@/lib/services/sellerService';
import { queryKeys } from '@/lib/query/queryKeys';
import { shortDate } from '@/lib/utils/format';

const EMPTY_DOC = { documentType: '', documentNumber: '', documentUrl: '', notes: '' };

export default function SellerApplyPage() {
  const queryClient = useQueryClient();
  const sellerQuery = useSellerMe();
  const [form, setForm] = useState({
    legalName: '',
    businessName: '',
    businessType: '',
    taxId: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    kycDetails: {
      bankAccountName: '',
      bankAccountNumber: '',
      bankIfsc: ''
    },
    documents: [{ ...EMPTY_DOC }]
  });

  const applyMutation = useMutation({
    mutationFn: applyForSeller,
    onSuccess: async () => {
      toast.success('Seller application submitted successfully');
      await queryClient.invalidateQueries({ queryKey: queryKeys.sellerMe });
    },
    onError: (error) => toast.error(error.message || 'Unable to submit seller application')
  });

  const profile = sellerQuery.data?.profile;
  const hasSubmitted = Boolean(profile);
  const isApproved = profile?.application_status === 'approved';

  const statusText = useMemo(() => {
    if (!profile) return 'No active seller application';
    if (profile.application_status === 'approved') return 'Your seller account is approved and active.';
    if (profile.application_status === 'rejected') return profile.rejection_reason || 'Your previous application was rejected. You can submit a revised profile.';
    return 'Your seller application is under review by the admin team.';
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      legalName: profile.legal_name || prev.legalName,
      businessName: profile.business_name || prev.businessName,
      businessType: profile.business_type || prev.businessType,
      taxId: profile.tax_id || prev.taxId,
      phone: profile.phone || prev.phone,
      email: profile.email || prev.email,
      addressLine1: profile.address_line1 || prev.addressLine1,
      addressLine2: profile.address_line2 || prev.addressLine2,
      city: profile.city || prev.city,
      state: profile.state || prev.state,
      country: profile.country || prev.country,
      postalCode: profile.postal_code || prev.postalCode
    }));
  }, [profile]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateKycField(key, value) {
    setForm((prev) => ({
      ...prev,
      kycDetails: { ...prev.kycDetails, [key]: value }
    }));
  }

  function updateDocument(index, key, value) {
    setForm((prev) => {
      const docs = [...prev.documents];
      docs[index] = { ...docs[index], [key]: value };
      return { ...prev, documents: docs };
    });
  }

  function addDocument() {
    setForm((prev) => ({ ...prev, documents: [...prev.documents, { ...EMPTY_DOC }] }));
  }

  function removeDocument(index) {
    setForm((prev) => {
      if (prev.documents.length === 1) return prev;
      return { ...prev, documents: prev.documents.filter((_, idx) => idx !== index) };
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const cleanedDocs = (form.documents || []).filter((doc) => doc.documentType && doc.documentUrl);
    if (!cleanedDocs.length) {
      toast.error('At least one valid document is required');
      return;
    }
    await applyMutation.mutateAsync({ ...form, documents: cleanedDocs });
  }

  if (sellerQuery.isLoading) return <SellerApplySkeleton />;
  if (sellerQuery.isError) return <ErrorState message="Seller application data could not be loaded." onRetry={sellerQuery.refetch} />;

  return (
    <div className="space-y-5">
      <SectionHeader title="Seller Application" subtitle="Submit business details and KYC to activate your seller console" />

      <div className="card-surface border border-accent/[0.28] bg-gradient-to-r from-accent/[0.08] to-transparent p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-accentSoft">Seller Account Policy</p>
        <p className="mt-1 text-sm font-semibold text-text">Seller Account Activation Fee: 100 USDT</p>
        <p className="mt-1 text-xs text-muted">A one-time activation fee is required before seller account approval is finalized.</p>
      </div>

      <div className="card-surface space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Application Status</p>
          <SellerStatusBadge status={profile?.application_status} />
        </div>
        <p className="text-sm text-text">{statusText}</p>
        {hasSubmitted ? (
          <p className="text-xs text-muted">
            Submitted: {shortDate(profile.created_at)}{profile.reviewed_at ? ` | Reviewed: ${shortDate(profile.reviewed_at)}` : ''}
          </p>
        ) : null}
        {isApproved ? (
          <Link href="/seller" className="inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black">
            Open Seller Dashboard
          </Link>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="card-surface space-y-4 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Legal Name</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" value={form.legalName} onChange={(e) => updateField('legalName', e.target.value)} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Business Name</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Business Type</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" value={form.businessType} onChange={(e) => updateField('businessType', e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Tax ID</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" value={form.taxId} onChange={(e) => updateField('taxId', e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Phone</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Business Email</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-muted">Address Line 1</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" value={form.addressLine1} onChange={(e) => updateField('addressLine1', e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-muted">Address Line 2</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" value={form.addressLine2} onChange={(e) => updateField('addressLine2', e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">City</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">State</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" value={form.state} onChange={(e) => updateField('state', e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Country</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" value={form.country} onChange={(e) => updateField('country', e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Postal Code</span>
            <input className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" value={form.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} />
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-cardSoft p-4">
          <p className="text-sm font-semibold text-text">KYC / Banking Details</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input className="rounded-xl border border-white/10 bg-card p-3 text-sm" placeholder="Bank Account Name" value={form.kycDetails.bankAccountName} onChange={(e) => updateKycField('bankAccountName', e.target.value)} />
            <input className="rounded-xl border border-white/10 bg-card p-3 text-sm" placeholder="Bank Account Number" value={form.kycDetails.bankAccountNumber} onChange={(e) => updateKycField('bankAccountNumber', e.target.value)} />
            <input className="rounded-xl border border-white/10 bg-card p-3 text-sm" placeholder="IFSC / Routing Code" value={form.kycDetails.bankIfsc} onChange={(e) => updateKycField('bankIfsc', e.target.value)} />
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-cardSoft p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text">Documents</p>
            <button type="button" onClick={addDocument} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-text">
              Add Document
            </button>
          </div>
          {form.documents.map((doc, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-white/10 bg-card p-3 md:grid-cols-4">
              <input className="rounded-lg border border-white/10 bg-cardSoft p-2.5 text-sm" placeholder="Type (PAN, GST, CIN...)" value={doc.documentType} onChange={(e) => updateDocument(index, 'documentType', e.target.value)} />
              <input className="rounded-lg border border-white/10 bg-cardSoft p-2.5 text-sm" placeholder="Document Number" value={doc.documentNumber} onChange={(e) => updateDocument(index, 'documentNumber', e.target.value)} />
              <input className="rounded-lg border border-white/10 bg-cardSoft p-2.5 text-sm md:col-span-2" placeholder="Document URL" value={doc.documentUrl} onChange={(e) => updateDocument(index, 'documentUrl', e.target.value)} />
              <input className="rounded-lg border border-white/10 bg-cardSoft p-2.5 text-sm md:col-span-3" placeholder="Notes (optional)" value={doc.notes} onChange={(e) => updateDocument(index, 'notes', e.target.value)} />
              <button type="button" onClick={() => removeDocument(index)} className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={applyMutation.isPending} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60">
            {applyMutation.isPending ? 'Submitting...' : hasSubmitted ? 'Resubmit Application' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
}
