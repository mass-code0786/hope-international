'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, LoaderCircle, MapPin, PencilLine, Phone, Plus, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { queryKeys } from '@/lib/query/queryKeys';
import { createUserAddress, getUserAddress, updateUserAddress } from '@/lib/services/userAddressService';
import { currency } from '@/lib/utils/format';
import { getProductPricing } from '@/lib/utils/pricing';

const emptyForm = {
  fullName: '',
  mobile: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: ''
};

function mapAddressToForm(address, prefill = {}) {
  if (!address) {
    return {
      ...emptyForm,
      fullName: prefill.fullName || '',
      mobile: prefill.mobile || '',
      country: prefill.country || ''
    };
  }

  return {
    fullName: address.fullName || prefill.fullName || '',
    mobile: address.mobile || prefill.mobile || '',
    addressLine1: address.addressLine || '',
    addressLine2: '',
    landmark: address.area || '',
    city: address.city || '',
    state: address.state || '',
    pincode: address.postalCode || '',
    country: address.country || prefill.country || ''
  };
}

function buildAddressPayload(form) {
  const addressLine = [form.addressLine1, form.addressLine2].map((value) => String(value || '').trim()).filter(Boolean).join(', ');

  return {
    fullName: String(form.fullName || '').trim(),
    mobile: String(form.mobile || '').trim(),
    alternateMobile: '',
    country: String(form.country || '').trim(),
    state: String(form.state || '').trim(),
    city: String(form.city || '').trim(),
    area: String(form.landmark || '').trim() || String(form.city || '').trim(),
    addressLine,
    postalCode: String(form.pincode || '').trim(),
    deliveryNote: ''
  };
}

function formatAddressLines(address) {
  if (!address) return [];
  return [address.addressLine, address.area, [address.city, address.state, address.postalCode].filter(Boolean).join(', '), address.country]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function Field({ label, required = false, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-slate-400">
        {label}
        {required ? <span className="text-rose-300"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-[18px] border border-white/10 bg-[#171c26] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 ${props.className || ''}`}
    />
  );
}

export function PurchaseAddressModal({ open, product, onClose, onContinue }) {
  const queryClient = useQueryClient();
  const addressQuery = useQuery({
    queryKey: queryKeys.userAddress,
    queryFn: getUserAddress,
    enabled: open
  });
  const [mode, setMode] = useState('select');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const price = product ? getProductPricing(product, 1).lineFinalTotal : 0;
  const savedAddress = addressQuery.data?.data?.address || null;
  const prefill = addressQuery.data?.data?.prefill || {};
  const selectedAddress = savedAddress && selectedAddressId === savedAddress.id ? savedAddress : null;
  const addressLines = useMemo(() => formatAddressLines(selectedAddress), [selectedAddress]);

  useEffect(() => {
    if (!open) return;
    const nextSavedAddress = addressQuery.data?.data?.address || null;
    const nextPrefill = addressQuery.data?.data?.prefill || {};
    setSelectedAddressId(nextSavedAddress?.id || '');
    setForm(mapAddressToForm(nextSavedAddress, nextPrefill));
    setMode(nextSavedAddress ? 'select' : 'form');
  }, [open, addressQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildAddressPayload(form);
      return savedAddress ? updateUserAddress(payload) : createUserAddress(payload);
    },
    onSuccess: async (result) => {
      const nextAddress = result?.data || null;
      toast.success(result?.message || 'Delivery address saved');
      setSelectedAddressId(nextAddress?.id || '');
      setMode('select');
      await queryClient.invalidateQueries({ queryKey: queryKeys.userAddress });
    },
    onError: (error) => toast.error(error.message || 'Unable to save address')
  });

  if (!open || !product) return null;

  const showForm = mode === 'form';

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close delivery address"
        className="absolute inset-0"
        onClick={() => {
          if (!saveMutation.isPending) onClose?.();
        }}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#1f2128_0%,#16181d_100%)] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        <div className="absolute -right-10 top-0 h-28 w-28 rounded-full bg-[rgba(14,165,233,0.18)] blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[rgba(34,197,94,0.12)] blur-3xl" />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Delivery Step</p>
          <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.03em] text-white">Choose delivery address</h3>
          <p className="mt-1 text-[13px] text-slate-400">Address is required before payment for {product.name || 'this product'}.</p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Product</p>
                <p className="mt-1 text-[15px] font-semibold text-white">{product.name || 'Product'}</p>
              </div>
              <p className="text-[15px] font-semibold text-white">{currency(price)}</p>
            </div>
          </div>

          {addressQuery.isLoading ? (
            <div className="mt-4 flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-slate-300">
              <LoaderCircle size={18} className="animate-spin" />
            </div>
          ) : null}

          {addressQuery.isError ? (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-[12px] text-rose-100">
              Address details could not be loaded.
            </div>
          ) : null}

          {!addressQuery.isLoading && !addressQuery.isError ? (
            <div className="mt-4 space-y-3">
              {!showForm && savedAddress ? (
                <div className="rounded-2xl border border-sky-400/25 bg-sky-500/10 p-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      checked={selectedAddressId === savedAddress.id}
                      onChange={() => setSelectedAddressId(savedAddress.id)}
                      className="mt-1 h-4 w-4 border-white/20 bg-transparent text-sky-400"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Deliver To</p>
                          <p className="mt-1 text-[15px] font-semibold text-white">{savedAddress.fullName}</p>
                        </div>
                        {savedAddress.isDefault ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-200">
                            <CheckCircle2 size={11} />
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 inline-flex items-center gap-1 text-[12px] text-slate-300">
                        <Phone size={12} />
                        {savedAddress.mobile}
                      </p>
                      <div className="mt-2 space-y-1 text-[12px] leading-5 text-slate-300">
                        {addressLines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    </div>
                  </label>
                </div>
              ) : null}

              {!showForm && savedAddress ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('form')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                  >
                    <PencilLine size={14} />
                    Change Address
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(mapAddressToForm(null, prefill));
                      setMode('form');
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                  >
                    <Plus size={14} />
                    Add New Address
                  </button>
                </div>
              ) : null}

              {showForm ? (
                <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin size={14} />
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em]">Address Form</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Full Name" required>
                      <TextInput value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} placeholder="Full name" />
                    </Field>
                    <Field label="Mobile Number" required>
                      <TextInput value={form.mobile} onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))} placeholder="Mobile number" />
                    </Field>
                    <Field label="Address Line 1" required className="sm:col-span-2">
                      <TextInput value={form.addressLine1} onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))} placeholder="House no / Building / Street" />
                    </Field>
                    <Field label="Address Line 2">
                      <TextInput value={form.addressLine2} onChange={(e) => setForm((prev) => ({ ...prev, addressLine2: e.target.value }))} placeholder="Apartment / Floor / Area" />
                    </Field>
                    <Field label="Landmark">
                      <TextInput value={form.landmark} onChange={(e) => setForm((prev) => ({ ...prev, landmark: e.target.value }))} placeholder="Nearby landmark / locality" />
                    </Field>
                    <Field label="City" required>
                      <TextInput value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} placeholder="City" />
                    </Field>
                    <Field label="State" required>
                      <TextInput value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} placeholder="State" />
                    </Field>
                    <Field label="Pincode" required>
                      <TextInput value={form.pincode} onChange={(e) => setForm((prev) => ({ ...prev, pincode: e.target.value }))} placeholder="Pincode" />
                    </Field>
                    <Field label="Country" required>
                      <TextInput value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} placeholder="Country" />
                    </Field>
                  </div>

                  <div className="flex gap-2">
                    {savedAddress ? (
                      <button
                        type="button"
                        onClick={() => {
                          setForm(mapAddressToForm(savedAddress, prefill));
                          setMode('select');
                        }}
                        className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                      >
                        Back
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#22c55e)] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_16px_30px_rgba(14,165,233,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="inline-flex items-center gap-2">
                        {saveMutation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                        {saveMutation.isPending ? 'Saving...' : savedAddress ? 'Update Address' : 'Save Address'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}

              {!showForm && !selectedAddress ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-[12px] text-amber-100">
                  <p className="inline-flex items-center gap-1 font-semibold">
                    <AlertCircle size={13} />
                    Delivery address required
                  </p>
                  <p className="mt-1">Save an address before continuing to payment.</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={saveMutation.isPending}
              className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedAddress) return;
                onContinue?.(selectedAddress);
              }}
              disabled={saveMutation.isPending || !selectedAddress}
              className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#22c55e)] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_16px_30px_rgba(14,165,233,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
