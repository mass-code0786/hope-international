'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { SellerStatusBadge } from '@/components/seller/SellerStatusBadge';
import { useSellerMe } from '@/hooks/useSellerMe';
import { useWallet } from '@/hooks/useWallet';
import { applyForSeller } from '@/lib/services/sellerService';
import { queryKeys } from '@/lib/query/queryKeys';
import { SELLER_APPLICATION_FEE_USD } from '@/lib/constants/seller';
import { currency, shortDate } from '@/lib/utils/format';

const EMPTY_DOC = { documentType: '', documentNumber: '', documentUrl: '', notes: '' };

export default function SellerApplyPage() {
  const queryClient = useQueryClient();
  const sellerQuery = useSellerMe();
  const walletQuery = useWallet();
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

  const walletBalance = Number(walletQuery.data?.wallet?.balance || 0);
  const hasFeeBalance = walletBalance >= SELLER_APPLICATION_FEE_USD;

  const applyMutation = useMutation({
    mutationFn: applyForSeller,
    onSuccess: async () => {
      toast.success('Seller application submitted successfully');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sellerMe }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet })
      ]);
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
    if (!hasFeeBalance) {
      toast.error(`A wallet balance of at least $${SELLER_APPLICATION_FEE_USD} is required`);
      return;
    }

    const cleanedDocs = (form.documents || []).filter((doc) => doc.documentType && doc.documentUrl);
    if (!cleanedDocs.length) {
      toast.error('At least one valid document is required');
      return;
    }
    await applyMutation.mutateAsync({ ...form, documents: cleanedDocs });
  }

  if (sellerQuery.isLoading) return null;
  if (sellerQuery.isError) return <ErrorState message="Seller application data could not be loaded." onRetry={sellerQuery.refetch} />;

  return (
    <div className="space-y-3">
      <SectionHeader title="Seller Application" subtitle="Business details and KYC" />

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Policy</p>
        <p className="mt-1 text-sm font-semibold text-slate-800">Activation Fee: ${SELLER_APPLICATION_FEE_USD}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">Exactly ${SELLER_APPLICATION_FEE_USD} is deducted from your wallet on the first seller application submission.</p>
        <p className="mt-1 text-[11px] text-slate-500">Wallet Balance: {walletQuery.isLoading ? 'Checking...' : currency(walletBalance)}</p>
        {!walletQuery.isLoading && !hasFeeBalance ? (
          <p className="mt-1 text-[11px] font-medium text-rose-600">Insufficient wallet balance for the $70 seller application fee.</p>
        ) : null}
      </div>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-600">Application Status</p>
          <SellerStatusBadge status={profile?.application_status} />
        </div>
        <p className="text-xs text-slate-800">{statusText}</p>
        {hasSubmitted ? (
          <p className="text-[10px] text-slate-500">
            Submitted: {shortDate(profile.created_at)}{profile.reviewed_at ? ` | Reviewed: ${shortDate(profile.reviewed_at)}` : ''}
          </p>
        ) : null}
        {isApproved ? (
          <Link href="/seller" className="inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white">
            Open Seller Dashboard
          </Link>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid gap-2 md:grid-cols-2">
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">Legal Name</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" value={form.legalName} onChange={(e) => updateField('legalName', e.target.value)} required />
          </label>
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">Business Name</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} required />
          </label>
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">Business Type</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" value={form.businessType} onChange={(e) => updateField('businessType', e.target.value)} />
          </label>
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">Tax ID</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" value={form.taxId} onChange={(e) => updateField('taxId', e.target.value)} />
          </label>
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">Phone</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} required />
          </label>
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">Business Email</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          </label>
          <label className="text-xs text-slate-600 md:col-span-2">
            <span className="mb-1 block">Address Line 1</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" value={form.addressLine1} onChange={(e) => updateField('addressLine1', e.target.value)} />
          </label>
          <label className="text-xs text-slate-600 md:col-span-2">
            <span className="mb-1 block">Address Line 2</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" value={form.addressLine2} onChange={(e) => updateField('addressLine2', e.target.value)} />
          </label>
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">City</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
          </label>
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">State</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" value={form.state} onChange={(e) => updateField('state', e.target.value)} />
          </label>
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">Country</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" value={form.country} onChange={(e) => updateField('country', e.target.value)} />
          </label>
          <label className="text-xs text-slate-600">
            <span className="mb-1 block">Postal Code</span>
            <input className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" value={form.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} />
          </label>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <p className="text-xs font-semibold text-slate-800">KYC / Banking</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <input className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700" placeholder="Account Name" value={form.kycDetails.bankAccountName} onChange={(e) => updateKycField('bankAccountName', e.target.value)} />
            <input className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700" placeholder="Account Number" value={form.kycDetails.bankAccountNumber} onChange={(e) => updateKycField('bankAccountNumber', e.target.value)} />
            <input className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700" placeholder="IFSC / Routing" value={form.kycDetails.bankIfsc} onChange={(e) => updateKycField('bankIfsc', e.target.value)} />
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-800">Documents</p>
            <button type="button" onClick={addDocument} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
              Add
            </button>
          </div>
          {form.documents.map((doc, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-4">
              <input className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" placeholder="Type" value={doc.documentType} onChange={(e) => updateDocument(index, 'documentType', e.target.value)} />
              <input className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700" placeholder="Number" value={doc.documentNumber} onChange={(e) => updateDocument(index, 'documentNumber', e.target.value)} />
              <input className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 md:col-span-2" placeholder="URL" value={doc.documentUrl} onChange={(e) => updateDocument(index, 'documentUrl', e.target.value)} />
              <input className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 md:col-span-3" placeholder="Notes" value={doc.notes} onChange={(e) => updateDocument(index, 'notes', e.target.value)} />
              <button type="button" onClick={() => removeDocument(index)} className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-600">
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={applyMutation.isPending || walletQuery.isLoading || !hasFeeBalance}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {applyMutation.isPending ? 'Submitting...' : hasSubmitted ? 'Resubmit' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
