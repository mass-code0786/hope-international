'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { queryKeys } from '@/lib/query/queryKeys';
import { createUserAddress, getUserAddress, updateUserAddress } from '@/lib/services/userAddressService';

const emptyForm = {
  fullName: '',
  mobile: '',
  alternateMobile: '',
  country: '',
  state: '',
  city: '',
  area: '',
  addressLine: '',
  postalCode: '',
  deliveryNote: ''
};

function TextInput(props) {
  return <input {...props} className={`w-full rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#171c26] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[rgba(167,139,250,0.5)] ${props.className || ''}`} />;
}

function TextArea(props) {
  return <textarea {...props} className={`w-full rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[#171c26] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[rgba(167,139,250,0.5)] ${props.className || ''}`} />;
}

export default function AddressPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const addressQuery = useQuery({
    queryKey: queryKeys.userAddress,
    queryFn: getUserAddress
  });

  useEffect(() => {
    const payload = addressQuery.data?.data;
    if (!payload) return;

    const saved = payload.address;
    const prefill = payload.prefill || {};

    setForm({
      fullName: saved?.fullName || prefill.fullName || '',
      mobile: saved?.mobile || prefill.mobile || '',
      alternateMobile: saved?.alternateMobile || '',
      country: saved?.country || prefill.country || '',
      state: saved?.state || '',
      city: saved?.city || '',
      area: saved?.area || '',
      addressLine: saved?.addressLine || '',
      postalCode: saved?.postalCode || '',
      deliveryNote: saved?.deliveryNote || ''
    });
  }, [addressQuery.data]);

  const hasSavedAddress = Boolean(addressQuery.data?.data?.address);
  const addressSummary = useMemo(() => {
    const saved = addressQuery.data?.data?.address;
    if (!saved) return '';
    return [saved.area, saved.city, saved.state, saved.country].filter(Boolean).join(', ');
  }, [addressQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => (hasSavedAddress ? updateUserAddress(form) : createUserAddress(form)),
    onSuccess: async (result) => {
      toast.success(result.message || (hasSavedAddress ? 'Address updated successfully' : 'Address saved successfully'));
      await queryClient.invalidateQueries({ queryKey: queryKeys.userAddress });
      router.push('/dashboard');
    },
    onError: (error) => toast.error(error.message || 'Failed to save address')
  });

  if (addressQuery.isLoading) {
    return <LoadingSkeleton className="h-72 rounded-[32px]" />;
  }

  if (addressQuery.isError) {
    return <ErrorState message="Address details could not be loaded." onRetry={addressQuery.refetch} />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Delivery Address"
        subtitle="Save the delivery area used for orders and dashboard delivery summaries."
        action={(
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#171c26] px-4 py-2 text-sm font-semibold text-white">
            <ArrowLeft size={15} /> Back
          </Link>
        )}
      />

      <div className="rounded-[32px] border border-[rgba(255,255,255,0.07)] bg-[#11141b] p-4 shadow-[0_24px_50px_rgba(0,0,0,0.32)]">
        <div className="flex items-start gap-3 rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[#161b24] p-4 shadow-[0_18px_36px_rgba(0,0,0,0.24)]">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(124,58,237,0.24),rgba(34,197,94,0.18))] text-white">
            <MapPin size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{hasSavedAddress ? 'Saved delivery area' : 'Set your delivery area'}</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">{addressSummary || 'Your saved delivery area will appear here after you complete the form.'}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextInput value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} placeholder="Full name" />
          <TextInput value={form.mobile} onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))} placeholder="Mobile number" />
          <TextInput value={form.alternateMobile} onChange={(e) => setForm((prev) => ({ ...prev, alternateMobile: e.target.value }))} placeholder="Alternate mobile number (optional)" />
          <TextInput value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} placeholder="Country" />
          <TextInput value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} placeholder="State / Province" />
          <TextInput value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} placeholder="District / City" />
          <TextInput value={form.area} onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))} placeholder="Area / Locality" />
          <TextInput value={form.postalCode} onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))} placeholder="Postal code / Zip code" />
        </div>

        <div className="mt-4 space-y-4">
          <TextArea value={form.addressLine} onChange={(e) => setForm((prev) => ({ ...prev, addressLine: e.target.value }))} rows={4} placeholder="Full address / House / Road / Landmark" />
          <TextArea value={form.deliveryNote} onChange={(e) => setForm((prev) => ({ ...prev, deliveryNote: e.target.value }))} rows={3} placeholder="Delivery note (optional)" />
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#7c3aed,#22c55e)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(124,58,237,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {saveMutation.isPending ? 'Saving...' : hasSavedAddress ? 'Update address' : 'Save address'}
          </button>
        </div>
      </div>
    </div>
  );
}
