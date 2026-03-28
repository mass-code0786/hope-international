'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatAuctionMoney } from '@/components/auctions/AuctionUi';

const EMPTY_FORM = {
  productId: '',
  title: '',
  shortDescription: '',
  description: '',
  imageUrl: '',
  galleryText: '',
  specsText: '',
  entryPrice: '0.50',
  hiddenCapacity: '100',
  stockQuantity: '1',
  rewardMode: 'stock',
  rewardValue: '',
  startAt: '',
  endAt: '',
  isActive: true
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_PATTERN.test(String(value || '').trim());
}

function toLocalDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function parseGallery(text) {
  return String(text || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function parseSpecs(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [label, ...rest] = line.split(':');
    return { label: (label || '').trim(), value: rest.join(':').trim() };
  }).filter((entry) => entry.label && entry.value);
}

export function toAuctionFormValues(auction) {
  if (!auction) return EMPTY_FORM;
  return {
    productId: String(auction.product_id || ''),
    title: auction.title || '',
    shortDescription: auction.short_description || '',
    description: auction.description || '',
    imageUrl: auction.image_url || '',
    galleryText: Array.isArray(auction.gallery) ? auction.gallery.join('\n') : '',
    specsText: Array.isArray(auction.specifications) ? auction.specifications.map((item) => `${item.label}: ${item.value}`).join('\n') : '',
    entryPrice: String(Number(auction.entry_price || auction.starting_price || 0.5).toFixed(2)),
    hiddenCapacity: String(Number(auction.hidden_capacity || 100)),
    stockQuantity: String(Number(auction.stock_quantity || 1)),
    rewardMode: auction.reward_mode || 'stock',
    rewardValue: auction.reward_value ? String(Number(auction.reward_value).toFixed(2)) : '',
    startAt: toLocalDateTimeInput(auction.start_at),
    endAt: toLocalDateTimeInput(auction.end_at),
    isActive: Boolean(auction.is_active)
  };
}

export function AuctionAdminForm({ initialValues, onSubmit, isSaving = false, submitLabel = 'Save Auction', products = [] }) {
  const [form, setForm] = useState(initialValues || EMPTY_FORM);

  useEffect(() => {
    setForm(initialValues || EMPTY_FORM);
  }, [initialValues]);

  const normalizedProducts = useMemo(() => (
    Array.isArray(products)
      ? products.map((product) => ({ ...product, id: String(product?.id || '') }))
      : []
  ), [products]);
  const previewGallery = useMemo(() => parseGallery(form.galleryText), [form.galleryText]);
  const selectedProduct = useMemo(() => normalizedProducts.find((product) => String(product.id) === String(form.productId)) || null, [normalizedProducts, form.productId]);
  const hasValidProductId = isUuid(selectedProduct?.id || form.productId);

  function handleSubmit() {
    const resolvedProductId = String(selectedProduct?.id || form.productId || '').trim();
    if (!isUuid(resolvedProductId)) {
      return;
    }

    onSubmit({
      productId: resolvedProductId,
      title: form.title,
      shortDescription: form.shortDescription,
      description: form.description,
      imageUrl: form.imageUrl,
      gallery: parseGallery(form.galleryText),
      specifications: parseSpecs(form.specsText),
      entryPrice: Number(form.entryPrice || 0.5),
      hiddenCapacity: Number(form.hiddenCapacity || 1),
      stockQuantity: Number(form.stockQuantity || 1),
      rewardMode: form.rewardMode,
      rewardValue: form.rewardMode === 'split' ? Number(form.rewardValue || 0.5) : undefined,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      isActive: Boolean(form.isActive)
    });
  }

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-card p-5">
      <label className="space-y-2 text-sm text-muted">
        <span>Product</span>
        <select value={form.productId} onChange={(e) => setForm((prev) => ({ ...prev, productId: String(e.target.value || '') }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text">
          <option value="">Select product</option>
          {normalizedProducts.map((product) => (
            <option key={product.id} value={String(product.id)}>{product.name} ({product.sku})</option>
          ))}
        </select>
        {selectedProduct ? <p className="text-xs text-muted">Catalog price: ${Number(selectedProduct.price || 0).toFixed(2)}</p> : null}
        {!hasValidProductId && form.productId ? <p className="text-xs text-rose-300">Selected product id is invalid. Please re-select a product.</p> : null}
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-muted">
          <span>Auction title</span>
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Short description</span>
          <input value={form.shortDescription} onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
        </label>
      </div>

      <label className="space-y-2 text-sm text-muted">
        <span>Description</span>
        <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={5} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-muted">
          <span>Image URL</span>
          <input value={form.imageUrl} onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Gallery URLs</span>
          <textarea value={form.galleryText} onChange={(e) => setForm((prev) => ({ ...prev, galleryText: e.target.value }))} rows={4} placeholder="One URL per line" className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
        </label>
      </div>

      <label className="space-y-2 text-sm text-muted">
        <span>Specifications</span>
        <textarea value={form.specsText} onChange={(e) => setForm((prev) => ({ ...prev, specsText: e.target.value }))} rows={4} placeholder="Condition: New\nColor: Black" className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
      </label>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-sm text-muted">
          <span>Fixed entry price</span>
          <input type="number" min="0.5" max="100" step="0.01" value={form.entryPrice} onChange={(e) => setForm((prev) => ({ ...prev, entryPrice: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Hidden capacity</span>
          <input type="number" min="1" step="1" value={form.hiddenCapacity} onChange={(e) => setForm((prev) => ({ ...prev, hiddenCapacity: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Stock quantity</span>
          <input type="number" min="1" step="1" value={form.stockQuantity} onChange={(e) => setForm((prev) => ({ ...prev, stockQuantity: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>Reward mode</span>
          <select value={form.rewardMode} onChange={(e) => setForm((prev) => ({ ...prev, rewardMode: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text">
            <option value="stock">Stock quantity</option>
            <option value="split">Split reward</option>
          </select>
        </label>
      </div>

      {form.rewardMode === 'split' ? (
        <label className="space-y-2 text-sm text-muted">
          <span>Total reward value</span>
          <input type="number" min="0.5" max="100" step="0.01" value={form.rewardValue} onChange={(e) => setForm((prev) => ({ ...prev, rewardValue: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
        </label>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-muted">
          <span>Start at</span>
          <input type="datetime-local" value={form.startAt} onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
        </label>
        <label className="space-y-2 text-sm text-muted">
          <span>End at</span>
          <input type="datetime-local" value={form.endAt} onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
        Auction active
      </label>

      <div className="rounded-2xl border border-white/10 bg-cardSoft p-3 text-xs text-muted">
        <p>Entry price range: {formatAuctionMoney(form.entryPrice || 0.5)} to $100.00</p>
        <p className="mt-1">Hidden capacity is admin-only and never shown to users.</p>
        <p className="mt-1">Gallery items: {previewGallery.length}</p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSaving || !form.productId || !hasValidProductId}
        className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}
