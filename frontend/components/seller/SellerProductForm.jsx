'use client';

import { useMemo } from 'react';
import { number } from '@/lib/utils/format';

const DEFAULT_FORM = {
  sku: '',
  name: '',
  description: '',
  category: '',
  price: '',
  bv: '',
  isQualifying: true,
  moderationNotes: ''
};

function toPv(bv) {
  const value = Number(bv || 0);
  return Number.isFinite(value) ? (value * 0.4).toFixed(2) : '0.00';
}

export function SellerProductForm({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  submitLabel = 'Submit Product'
}) {
  const form = value || DEFAULT_FORM;
  const pv = useMemo(() => toPv(form.bv), [form.bv]);

  function update(key, input) {
    onChange({ ...form, [key]: input });
  }

  return (
    <form onSubmit={onSubmit} className="card-surface space-y-4 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted">SKU</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
            value={form.sku}
            onChange={(e) => update('sku', e.target.value)}
            placeholder="SKU-001"
            required
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-muted">Category</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            placeholder="Health / Beauty / Digital"
          />
        </label>

        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-muted">Product Name</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Premium Product Name"
            required
          />
        </label>

        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-muted">Description</span>
          <textarea
            className="min-h-28 w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Product details, value proposition, usage..."
            required
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-muted">Price</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
            value={form.price}
            onChange={(e) => update('price', e.target.value)}
            type="number"
            step="0.01"
            min="0"
            required
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-muted">BV</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
            value={form.bv}
            onChange={(e) => update('bv', e.target.value)}
            type="number"
            step="0.01"
            min="0"
            required
          />
        </label>

        <div className="rounded-xl border border-accent/20 bg-accent/10 p-3 text-sm md:col-span-2">
          <p className="text-muted">PV is auto-calculated from BV at 40%.</p>
          <p className="mt-1 text-base font-semibold text-accentSoft">Calculated PV: {number(pv)}</p>
        </div>

        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(form.isQualifying)}
            onChange={(e) => update('isQualifying', e.target.checked)}
          />
          <span className="text-muted">Qualifying / MLM eligible product</span>
        </label>

        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-muted">Moderation Notes (optional)</span>
          <textarea
            className="min-h-20 w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
            value={form.moderationNotes}
            onChange={(e) => update('moderationNotes', e.target.value)}
            placeholder="Any seller note for the admin moderation team"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
        >
          {isSubmitting ? 'Submitting...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
