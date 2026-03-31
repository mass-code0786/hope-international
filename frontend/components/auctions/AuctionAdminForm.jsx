'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatAuctionMoney } from '@/components/auctions/AuctionUi';
import { compressImageFile, compressImageFiles } from '@/lib/utils/imageUpload';

const EMPTY_FORM = {
  sourceMode: 'existing',
  productId: '',
  title: '',
  shortDescription: '',
  description: '',
  imageUrl: '',
  galleryText: '',
  specsText: '',
  category: '',
  itemCondition: '',
  shippingDetails: '',
  entryPrice: '0.10',
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
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(':');
      return { label: (label || '').trim(), value: rest.join(':').trim() };
    })
    .filter((entry) => entry.label && entry.value);
}

export function toAuctionFormValues(auction) {
  if (!auction) return EMPTY_FORM;
  return {
    sourceMode: auction.product_id ? 'existing' : 'standalone',
    productId: String(auction.product_id || ''),
    title: auction.title || '',
    shortDescription: auction.short_description || '',
    description: auction.description || '',
    imageUrl: auction.image_url || '',
    galleryText: Array.isArray(auction.gallery) ? auction.gallery.join('\n') : '',
    specsText: Array.isArray(auction.specifications) ? auction.specifications.map((item) => `${item.label}: ${item.value}`).join('\n') : '',
    category: auction.category || '',
    itemCondition: auction.item_condition || '',
    shippingDetails: auction.shipping_details || '',
    entryPrice: String(Number(auction.entry_price || auction.starting_price || 0.1).toFixed(2)),
    hiddenCapacity: String(Number(auction.hidden_capacity || 100)),
    stockQuantity: String(Number(auction.stock_quantity || 1)),
    rewardMode: auction.reward_mode || 'stock',
    rewardValue: auction.reward_value ? String(Number(auction.reward_value).toFixed(2)) : '',
    startAt: toLocalDateTimeInput(auction.start_at),
    endAt: toLocalDateTimeInput(auction.end_at),
    isActive: Boolean(auction.is_active)
  };
}

function PreviewImage({ src, alt }) {
  if (!src) return <div className="flex h-24 items-center justify-center rounded-2xl border border-white/10 bg-cardSoft text-xs text-muted">No image</div>;
  return <img src={src} alt={alt} className="h-24 w-full rounded-2xl border border-white/10 object-cover" />;
}

export function AuctionAdminForm({ initialValues, onSubmit, isSaving = false, submitLabel = 'Save Auction', products = [] }) {
  const [form, setForm] = useState(initialValues || EMPTY_FORM);
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

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
  const productFallback = selectedProduct?.image_url || selectedProduct?.gallery?.[0] || '';
  const isStandalone = form.sourceMode === 'standalone';

  async function handleMainImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingMain(true);
      const imageUrl = await compressImageFile(file, { maxWidth: 1400, maxHeight: 1400 });
      setForm((prev) => ({ ...prev, imageUrl }));
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
      const uploaded = await compressImageFiles(files, { maxWidth: 1400, maxHeight: 1400 });
      setForm((prev) => ({ ...prev, galleryText: [...parseGallery(prev.galleryText), ...uploaded].join('\n') }));
    } finally {
      setIsUploadingGallery(false);
      event.target.value = '';
    }
  }

  function handleSubmit() {
    const resolvedProductId = String(selectedProduct?.id || form.productId || '').trim();
    if (!isStandalone && !isUuid(resolvedProductId)) {
      return;
    }

    onSubmit({
      sourceMode: form.sourceMode,
      productId: isStandalone ? undefined : resolvedProductId,
      title: isStandalone ? form.title : undefined,
      shortDescription: isStandalone ? form.shortDescription : undefined,
      description: isStandalone ? form.description : undefined,
      imageUrl: isStandalone ? form.imageUrl : undefined,
      gallery: isStandalone ? parseGallery(form.galleryText) : undefined,
      specifications: isStandalone ? parseSpecs(form.specsText) : undefined,
      category: isStandalone ? form.category : undefined,
      itemCondition: isStandalone ? form.itemCondition : undefined,
      shippingDetails: isStandalone ? form.shippingDetails : undefined,
      entryPrice: Number(form.entryPrice || 0.1),
      hiddenCapacity: Number(form.hiddenCapacity || 1),
      stockQuantity: Number(form.stockQuantity || 1),
      rewardMode: form.rewardMode,
      rewardValue: form.rewardMode === 'split' ? Number(form.rewardValue || 0.01) : undefined,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      isActive: Boolean(form.isActive)
    });
  }

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-card p-5">
      <div className="grid gap-2 md:grid-cols-2">
        <button onClick={() => setForm((prev) => ({ ...prev, sourceMode: 'existing' }))} className={`rounded-2xl border px-4 py-3 text-left ${!isStandalone ? 'border-accent bg-accent/10 text-text' : 'border-white/10 bg-cardSoft text-muted'}`}>
          <p className="text-sm font-semibold">Existing Product</p>
          <p className="mt-1 text-xs">Link this auction to a product that already exists in the platform catalog.</p>
        </button>
        <button onClick={() => setForm((prev) => ({ ...prev, sourceMode: 'standalone', productId: '' }))} className={`rounded-2xl border px-4 py-3 text-left ${isStandalone ? 'border-accent bg-accent/10 text-text' : 'border-white/10 bg-cardSoft text-muted'}`}>
          <p className="text-sm font-semibold">New Auction Product</p>
          <p className="mt-1 text-xs">Create a standalone auction item used only inside the auctions module.</p>
        </button>
      </div>

      {!isStandalone ? (
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
      ) : (
        <>
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

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-muted">
              <span>Category</span>
              <input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
            </label>
            <label className="space-y-2 text-sm text-muted">
              <span>Item condition</span>
              <input value={form.itemCondition} onChange={(e) => setForm((prev) => ({ ...prev, itemCondition: e.target.value }))} placeholder="New / Open box / Refurbished" className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
            </label>
          </div>

          <label className="space-y-2 text-sm text-muted">
            <span>Description</span>
            <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={5} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
          </label>

          <label className="space-y-2 text-sm text-muted">
            <span>Shipping / delivery details</span>
            <textarea value={form.shippingDetails} onChange={(e) => setForm((prev) => ({ ...prev, shippingDetails: e.target.value }))} rows={3} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm text-muted">
              <span>Primary auction image</span>
              <input type="file" accept="image/*" onChange={handleMainImageChange} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
              <input value={form.imageUrl} onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" placeholder="Image URL or uploaded data URL" />
              <p className="text-xs text-muted">{isUploadingMain ? 'Uploading image...' : 'Standalone auction items require a primary image.'}</p>
            </div>
            <div className="space-y-2 text-sm text-muted">
              <span>Gallery images</span>
              <input type="file" accept="image/*" multiple onChange={handleGalleryChange} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
              <textarea value={form.galleryText} onChange={(e) => setForm((prev) => ({ ...prev, galleryText: e.target.value }))} rows={4} placeholder="One URL per line" className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
              <p className="text-xs text-muted">{isUploadingGallery ? 'Uploading gallery...' : `${previewGallery.length} gallery image${previewGallery.length === 1 ? '' : 's'}`}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <PreviewImage src={form.imageUrl || productFallback} alt={form.title || 'Auction preview'} />
            {previewGallery.slice(0, 3).map((src, index) => <PreviewImage key={`${src}-${index}`} src={src} alt={`Gallery ${index + 1}`} />)}
          </div>

          <label className="space-y-2 text-sm text-muted">
            <span>Specifications</span>
            <textarea value={form.specsText} onChange={(e) => setForm((prev) => ({ ...prev, specsText: e.target.value }))} rows={4} placeholder="Condition: New\nColor: Black" className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
          </label>
        </>
      )}

      {!isStandalone && selectedProduct ? (
        <div className="rounded-2xl border border-white/10 bg-cardSoft p-4 text-sm text-muted">
          <p className="font-semibold text-text">{selectedProduct.name}</p>
          <p className="mt-1 text-xs">{selectedProduct.description || 'This catalog product will be used as the auction item source.'}</p>
          <p className="mt-2 text-xs">Category: {selectedProduct.category || 'Uncategorized'}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-sm text-muted">
          <span>Fixed entry price</span>
          <input type="number" min="0.10" step="0.01" value={form.entryPrice} onChange={(e) => setForm((prev) => ({ ...prev, entryPrice: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
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
          <input type="number" min="0.01" step="0.01" value={form.rewardValue} onChange={(e) => setForm((prev) => ({ ...prev, rewardValue: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-cardSoft px-3 py-2.5 text-sm text-text" />
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
        <p>Entry price must be at least $0.10</p>
        {form.rewardMode === 'split' ? <p className="mt-1">Reward value must be greater than $0.00</p> : null}
        <p className="mt-1">Hidden capacity is admin-only and never shown to users.</p>
        <p className="mt-1">Mode: {isStandalone ? 'Standalone auction-only item' : 'Existing catalog product'}</p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSaving || isUploadingMain || isUploadingGallery || (!isStandalone && (!form.productId || !hasValidProductId))}
        className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving || isUploadingMain || isUploadingGallery ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}




