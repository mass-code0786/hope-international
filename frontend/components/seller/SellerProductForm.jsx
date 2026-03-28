'use client';

import { useMemo, useState } from 'react';
import { number } from '@/lib/utils/format';
import { compressImageFile, compressImageFiles } from '@/lib/utils/imageUpload';

const DEFAULT_FORM = {
  sku: '',
  name: '',
  description: '',
  category: '',
  price: '',
  bv: '',
  imageUrl: '',
  galleryText: '',
  isQualifying: true,
  moderationNotes: ''
};

function toPv(bv) {
  const value = Number(bv || 0);
  return Number.isFinite(value) ? (value * 0.4).toFixed(2) : '0.00';
}

function parseGallery(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ImagePreview({ src, alt, className }) {
  if (!src) {
    return <div className={className + ' flex items-center justify-center bg-cardSoft text-xs text-muted'}>No image</div>;
  }
  return <img src={src} alt={alt} className={className + ' object-cover'} />;
}

export function SellerProductForm({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  submitLabel = 'Submit Product'
}) {
  const form = value || DEFAULT_FORM;
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const pv = useMemo(() => toPv(form.bv), [form.bv]);
  const gallery = useMemo(() => parseGallery(form.galleryText), [form.galleryText]);

  function update(key, input) {
    onChange({ ...form, [key]: input });
  }

  async function handleMainImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingMain(true);
      const imageUrl = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200 });
      update('imageUrl', imageUrl);
    } finally {
      setIsUploadingMain(false);
      event.target.value = '';
    }
  }

  async function handleGalleryChange(event) {
    const files = event.target.files;
    if (!files?.length) return;
    try {
      setIsUploadingGallery(true);
      const uploaded = await compressImageFiles(files, { maxWidth: 1200, maxHeight: 1200 });
      const merged = [...gallery, ...uploaded];
      update('galleryText', merged.join('\n'));
    } finally {
      setIsUploadingGallery(false);
      event.target.value = '';
    }
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

        <div className="space-y-3 md:col-span-2">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <span className="block text-muted">Main Image</span>
              <input type="file" accept="image/*" onChange={handleMainImageChange} className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" />
              <input
                className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
                value={form.imageUrl}
                onChange={(e) => update('imageUrl', e.target.value)}
                placeholder="Image URL or uploaded data URL"
              />
              <p className="text-xs text-muted">{isUploadingMain ? 'Uploading main image...' : 'If empty, storefront will show a placeholder.'}</p>
            </div>

            <div className="space-y-2 text-sm">
              <span className="block text-muted">Gallery Images</span>
              <input type="file" accept="image/*" multiple onChange={handleGalleryChange} className="w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm" />
              <textarea
                className="min-h-28 w-full rounded-xl border border-white/10 bg-cardSoft p-3 text-sm"
                value={form.galleryText}
                onChange={(e) => update('galleryText', e.target.value)}
                placeholder="One image URL per line"
              />
              <p className="text-xs text-muted">{isUploadingGallery ? 'Uploading gallery images...' : `${gallery.length} gallery image${gallery.length === 1 ? '' : 's'}`}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <ImagePreview src={form.imageUrl} alt={form.name || 'Product preview'} className="h-24 rounded-xl border border-white/10" />
            {gallery.slice(0, 3).map((src, index) => (
              <ImagePreview key={`${src}-${index}`} src={src} alt={`Gallery ${index + 1}`} className="h-24 rounded-xl border border-white/10" />
            ))}
          </div>
        </div>

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
          disabled={isSubmitting || isUploadingMain || isUploadingGallery}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
        >
          {isSubmitting ? 'Submitting...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
