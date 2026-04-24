'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, LoaderCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

import { queryKeys } from '@/lib/query/queryKeys';
import {
  createHelpingHandApplication,
  getHelpingHandEligibility,
  getMyHelpingHandApplications
} from '@/lib/services/helpingHandService';
import { currency } from '@/lib/utils/format';
import { compressImageFile } from '@/lib/utils/imageUpload';
import { resolveMediaUrl } from '@/lib/utils/media';

const RELATION_OPTIONS = ['Self', 'Neighbor', 'Relative', 'Orphan', 'Widow', 'Needy', 'Other'];
const CATEGORY_OPTIONS = ['Medical', 'Education', 'Food', 'Marriage Support', 'Emergency', 'Other'];
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

function createEmptyForm() {
  return {
    applicantName: '',
    applicantPhone: '',
    applicantAddress: '',
    applicantRelation: 'Self',
    helpCategory: 'Medical',
    requestedAmount: '',
    reason: '',
    documentDataUrl: '',
    documentName: ''
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'approved' || value === 'donated') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (value === 'rejected') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
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

export function HelpingHandCard() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm);

  const eligibilityQuery = useQuery({
    queryKey: queryKeys.helpingHandEligibility,
    queryFn: async () => (await getHelpingHandEligibility()).data
  });

  const applicationsQuery = useQuery({
    queryKey: queryKeys.helpingHandApplications,
    queryFn: () => getMyHelpingHandApplications({ page: 1, limit: 20 })
  });

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await createHelpingHandApplication(payload);
      return response.data;
    },
    onSuccess: async () => {
      setForm(createEmptyForm());
      setIsFormOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.helpingHandApplications }),
        queryClient.invalidateQueries({ queryKey: queryKeys.helpingHandEligibility })
      ]);
      toast.success('Helping Hand application submitted');
    },
    onError: (error) => {
      toast.error(error?.message || 'Could not submit Helping Hand application');
    }
  });

  const eligibility = eligibilityQuery.data || { eligible: false, totalDeposit: 0, requiredDeposit: 1000 };
  const applications = applicationsQuery.data?.data || [];
  const inputClass = 'w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#171c26] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[rgba(255,255,255,0.18)]';
  const canApply = Boolean(eligibility.eligible);

  async function handleDocumentChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, documentDataUrl: '', documentName: '' }));
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      event.target.value = '';
      toast.error('File must be 3MB or smaller');
      return;
    }

    try {
      let documentDataUrl = '';

      if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        documentDataUrl = await compressImageFile(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.86 });
      } else if (file.type === 'application/pdf') {
        documentDataUrl = await readFileAsDataUrl(file);
      } else {
        throw new Error('Only JPG, PNG, WEBP, or PDF files are supported');
      }

      setForm((prev) => ({
        ...prev,
        documentDataUrl,
        documentName: file.name
      }));
    } catch (error) {
      event.target.value = '';
      toast.error(error?.message || 'Could not process file');
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOpenForm() {
    if (!canApply) {
      toast.error('Minimum $1000 deposit required to apply.');
      return;
    }
    setIsFormOpen(true);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!canApply) {
      toast.error('Minimum $1000 deposit required to apply.');
      return;
    }

    submitMutation.mutate({
      applicantName: form.applicantName.trim(),
      applicantPhone: form.applicantPhone.trim(),
      applicantAddress: form.applicantAddress.trim(),
      applicantRelation: form.applicantRelation,
      helpCategory: form.helpCategory,
      requestedAmount: Number(form.requestedAmount),
      reason: form.reason.trim(),
      documentDataUrl: form.documentDataUrl || undefined
    });
  }

  return (
    <div className="card-surface p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Helping Hand</p>
            <p className="mt-1 text-xs leading-5 text-muted">Help orphan, widow, and needy people through Hope International.</p>
            {eligibilityQuery.isLoading ? (
              <p className="mt-2 text-xs text-slate-400">Checking eligibility...</p>
            ) : null}
            {!eligibilityQuery.isLoading && !eligibilityQuery.isError && !canApply ? (
              <p className="mt-2 text-xs font-medium text-amber-300">Minimum $1000 deposit required to apply.</p>
            ) : null}
            {eligibilityQuery.isError ? (
              <p className="mt-2 text-xs text-rose-300">Eligibility could not be checked right now.</p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenForm}
          disabled={!canApply || eligibilityQuery.isLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] border border-[rgba(255,255,255,0.12)] bg-[#1a1f28] px-4 text-sm font-semibold text-white transition hover:border-[rgba(255,255,255,0.2)] hover:bg-[#202631] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {eligibilityQuery.isLoading ? <LoaderCircle size={16} className="animate-spin" /> : null}
          Apply Now
        </button>
      </div>

      {isFormOpen && canApply ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(22,27,36,0.98),rgba(17,20,27,0.98))] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Applicant Name">
              <input
                value={form.applicantName}
                onChange={(event) => updateField('applicantName', event.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Applicant Phone">
              <input
                value={form.applicantPhone}
                onChange={(event) => updateField('applicantPhone', event.target.value)}
                className={inputClass}
                required
              />
            </Field>
          </div>

          <Field label="Applicant Address">
            <input
              value={form.applicantAddress}
              onChange={(event) => updateField('applicantAddress', event.target.value)}
              className={inputClass}
              required
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Applicant Relation">
              <select
                value={form.applicantRelation}
                onChange={(event) => updateField('applicantRelation', event.target.value)}
                className={inputClass}
              >
                {RELATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Help Category">
              <select
                value={form.helpCategory}
                onChange={(event) => updateField('helpCategory', event.target.value)}
                className={inputClass}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Requested Help Amount">
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.requestedAmount}
                onChange={(event) => updateField('requestedAmount', event.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Applicant Document/Image">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleDocumentChange}
                className={`${inputClass} file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white`}
              />
              {form.documentName ? <p className="text-xs text-slate-400">{form.documentName}</p> : null}
            </Field>
          </div>

          <Field label="Reason / Details">
            <textarea
              value={form.reason}
              onChange={(event) => updateField('reason', event.target.value)}
              className={`${inputClass} min-h-[120px] resize-y`}
              required
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
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#1b212c] text-white">
            <FileText size={16} />
          </span>
          <p className="text-sm font-semibold text-text">My Applications</p>
        </div>

        {applicationsQuery.isLoading ? (
          <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#171c26] px-4 py-3 text-sm text-slate-400">
            Loading applications...
          </div>
        ) : null}

        {applicationsQuery.isError ? (
          <div className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            Applications could not be loaded right now.
          </div>
        ) : null}

        {!applicationsQuery.isLoading && !applicationsQuery.isError && !applications.length ? (
          <div className="rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[#171c26] px-4 py-3 text-sm text-slate-400">
            No applications yet.
          </div>
        ) : null}

        {applications.map((item) => (
          <article key={item.id} className="rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[#171c26] p-4 shadow-[0_14px_28px_rgba(0,0,0,0.18)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{item.applicant_name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {item.applicant_relation} / {item.help_category} / {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusTone(item.status)}`}>
                  {item.status}
                </span>
                <span className="text-sm font-semibold text-white">{currency(item.requested_amount)}</span>
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-300">{item.reason}</p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>{item.applicant_phone}</span>
              <span>{item.applicant_address}</span>
              {item.document_render_url || item.document_url ? (
                <a
                  href={resolveMediaUrl(item.document_render_url || item.document_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-accent"
                >
                  View file
                </a>
              ) : null}
            </div>

            {item.admin_note ? (
              <div className="mt-3 rounded-[16px] border border-[rgba(255,255,255,0.06)] bg-[#11141b] px-3.5 py-3 text-sm text-slate-300">
                {item.admin_note}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
