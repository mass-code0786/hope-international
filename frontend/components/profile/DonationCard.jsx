'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartHandshake, LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { queryKeys } from '@/lib/query/queryKeys';
import { createDonation, getMyDonations } from '@/lib/services/donationService';
import { currency } from '@/lib/utils/format';

const PURPOSE_OPTIONS = [
  'Orphan Support',
  'Widow Support',
  'Medical Help',
  'Education Help',
  'Food Help',
  'Emergency Help',
  'General Donation'
];

function createEmptyForm() {
  return {
    amount: '',
    purpose: 'Orphan Support',
    note: ''
  };
}

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'completed') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (value === 'reversed') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  if (value === 'failed') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  return 'border-[rgba(255,255,255,0.08)] bg-[#1b212c] text-slate-300';
}

function Field({ label, children }) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function DonationCard() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm);

  const donationsQuery = useQuery({
    queryKey: queryKeys.donations,
    queryFn: () => getMyDonations({ page: 1, limit: 20 })
  });

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await createDonation(payload);
      return response.data;
    },
    onSuccess: async () => {
      setForm(createEmptyForm());
      setIsFormOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.donations }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet })
      ]);
      toast.success('Donation submitted');
    },
    onError: (error) => {
      const message = String(error?.message || '').trim();
      if (message.toLowerCase() === 'insufficient wallet balance' || message.toLowerCase() === 'insufficient wallet balance.') {
        toast.error('Insufficient wallet balance.');
        return;
      }
      toast.error(message || 'Could not submit donation');
    }
  });

  const donations = donationsQuery.data?.data || [];
  const inputClass = 'w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#171c26] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[rgba(255,255,255,0.18)]';

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    submitMutation.mutate({
      amount: Number(form.amount),
      purpose: form.purpose,
      note: form.note.trim() || undefined
    });
  }

  return (
    <div className="card-surface p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent">
            <HeartHandshake size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Donation</p>
            <p className="mt-1 text-xs leading-5 text-muted">Support orphan, widow, and needy people.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-[rgba(255,255,255,0.12)] bg-[#1a1f28] px-4 text-sm font-semibold text-white transition hover:border-[rgba(255,255,255,0.2)] hover:bg-[#202631]"
        >
          Donate Now
        </button>
      </div>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(22,27,36,0.98),rgba(17,20,27,0.98))] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Donation Amount">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) => updateField('amount', event.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Purpose">
              <select
                value={form.purpose}
                onChange={(event) => updateField('purpose', event.target.value)}
                className={inputClass}
              >
                {PURPOSE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Note">
            <textarea
              value={form.note}
              onChange={(event) => updateField('note', event.target.value)}
              className={`${inputClass} min-h-[110px] resize-y`}
            />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setForm(createEmptyForm());
                setIsFormOpen(false);
              }}
              className="inline-flex h-11 items-center justify-center rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#171c26] px-4 text-sm font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-accent px-4 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitMutation.isPending ? <LoaderCircle size={16} className="animate-spin" /> : null}
              Submit
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-4 space-y-3">
        <p className="text-sm font-semibold text-text">My Donations</p>

        {donationsQuery.isLoading ? (
          <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#171c26] px-4 py-3 text-sm text-slate-400">
            Loading donations...
          </div>
        ) : null}

        {donationsQuery.isError ? (
          <div className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            Donations could not be loaded right now.
          </div>
        ) : null}

        {!donationsQuery.isLoading && !donationsQuery.isError && !donations.length ? (
          <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#171c26] px-4 py-3 text-sm text-slate-400">
            No donations yet.
          </div>
        ) : null}

        {donations.map((item) => (
          <article key={item.id} className="rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[#171c26] p-4 shadow-[0_14px_28px_rgba(0,0,0,0.18)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{item.purpose}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusTone(item.status)}`}>
                  {item.status}
                </span>
                <span className="text-sm font-semibold text-white">{currency(item.amount)}</span>
              </div>
            </div>
            {item.note ? <p className="mt-3 text-sm leading-6 text-slate-300">{item.note}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
