'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Landmark, X } from 'lucide-react';
import toast from 'react-hot-toast';

const PURPOSE_OPTIONS = ['Business', 'Education', 'Medical', 'Emergency', 'Personal', 'Other'];

function createEmptyForm(defaultFullName = '') {
  return {
    fullName: defaultFullName,
    phoneNumber: '',
    loanAmount: '',
    purpose: 'Business',
    repaymentDuration: '',
    details: ''
  };
}

function Field({ label, children }) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function LoanApplicationCard({ defaultFullName = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(() => createEmptyForm(defaultFullName));

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || defaultFullName
    }));
  }, [defaultFullName]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const inputClass = 'w-full rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#171c26] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[rgba(255,255,255,0.18)]';

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClose() {
    setIsOpen(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    toast('Loan application feature is coming soon.');
    setForm(createEmptyForm(defaultFullName));
    setIsOpen(false);
  }

  return (
    <>
      <div className="card-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--hope-accent-soft)] text-accent">
              <Landmark size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">Apply for Loan</p>
              <p className="mt-1 text-xs leading-5 text-muted">Request financial support through Hope International.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex h-11 items-center justify-center rounded-[16px] border border-[rgba(255,255,255,0.12)] bg-[#1a1f28] px-4 text-sm font-semibold text-white transition hover:border-[rgba(255,255,255,0.2)] hover:bg-[#202631]"
          >
            Apply Now
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(2,6,23,0.82)] px-0 pt-10 backdrop-blur-sm sm:items-center sm:px-4 sm:pt-4"
          >
            <button
              type="button"
              aria-label="Close loan application"
              className="absolute inset-0"
              onClick={handleClose}
            />

            <motion.section
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,#161b24_0%,#10141c_100%)] text-white shadow-[0_30px_80px_rgba(0,0,0,0.46)] sm:rounded-[30px]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,61,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(50,209,125,0.1),transparent_24%)]" />

              <div className="relative flex items-start justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Loan Request</p>
                  <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">Apply for Loan</h3>
                  <p className="mt-1 text-sm text-slate-400">Request financial support through Hope International.</p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-white/[0.04] text-slate-200 transition hover:border-[rgba(255,255,255,0.16)] hover:bg-white/[0.08]"
                  aria-label="Close loan application"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="relative overflow-y-auto px-4 py-4 sm:px-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Full Name">
                      <input
                        value={form.fullName}
                        onChange={(event) => updateField('fullName', event.target.value)}
                        className={inputClass}
                        required
                      />
                    </Field>

                    <Field label="Phone Number">
                      <input
                        value={form.phoneNumber}
                        onChange={(event) => updateField('phoneNumber', event.target.value)}
                        className={inputClass}
                        required
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Loan Amount">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={form.loanAmount}
                        onChange={(event) => updateField('loanAmount', event.target.value)}
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

                  <Field label="Repayment Duration">
                    <input
                      value={form.repaymentDuration}
                      onChange={(event) => updateField('repaymentDuration', event.target.value)}
                      className={inputClass}
                      placeholder="e.g. 12 months"
                      required
                    />
                  </Field>

                  <Field label="Details / Reason">
                    <textarea
                      value={form.details}
                      onChange={(event) => updateField('details', event.target.value)}
                      className={`${inputClass} min-h-[130px] resize-y`}
                      required
                    />
                  </Field>

                  <div className="flex flex-col gap-3 border-t border-[rgba(255,255,255,0.06)] pt-4 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setForm(createEmptyForm(defaultFullName));
                        setIsOpen(false);
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-[#171c26] px-4 text-sm font-semibold text-slate-300"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center rounded-[16px] bg-accent px-4 text-sm font-semibold text-slate-950"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
