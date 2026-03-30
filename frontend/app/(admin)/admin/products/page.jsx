'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { FilterBar } from '@/components/admin/FilterBar';
import { SearchInput } from '@/components/admin/SearchInput';
import { DataTable } from '@/components/admin/DataTable';
import { ActionPanel } from '@/components/admin/ActionPanel';
import { ErrorState } from '@/components/ui/ErrorState';
import { AdminShellSkeleton } from '@/components/admin/AdminSkeletons';
import { queryKeys } from '@/lib/query/queryKeys';
import { createAdminProduct, getAdminProducts, updateAdminProduct } from '@/lib/services/admin';
import { currency, number } from '@/lib/utils/format';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { compressImageFile, compressImageFiles } from '@/lib/utils/imageUpload';

const initialForm = {
  name: '',
  sku: '',
  description: '',
  price: '',
  bv: '',
  category: 'Digital',
  imageUrl: '',
  galleryText: '',
  isQualifying: true,
  moderationStatus: 'pending',
  moderationNotes: ''
};

function parseGallery(text) {
  return String(text || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function MediaPreview({ src, alt }) {
  if (!src) return <div className="flex h-20 items-center justify-center rounded-xl border border-white/10 bg-cardSoft text-xs text-muted">No image</div>;
  return <img src={src} alt={alt} className="h-20 w-full rounded-xl border border-white/10 object-cover" />;
}

export default function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isActiveFilter, setIsActiveFilter] = useState('all');
  const [editingId, setEditingId] = useState('');
  const [isUploadingMain, setIsUploadingMain] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [form, setForm] = useState(initialForm);
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: [...queryKeys.adminProducts, search, page, isActiveFilter],
    queryFn: () => getAdminProducts({ search, page, limit: 100, isActive: isActiveFilter })
  });

  const gallery = useMemo(() => parseGallery(form.galleryText), [form.galleryText]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const bv = Number(form.bv || 0);
      const payload = {
        name: form.name,
        sku: form.sku,
        description: form.description,
        category: form.category,
        imageUrl: form.imageUrl || undefined,
        gallery,
        price: Number(form.price || 0),
        bv,
        pv: Number((bv * 0.4).toFixed(2)),
        isQualifying: Boolean(form.isQualifying)
      };
      if (editingId) {
        payload.moderationStatus = form.moderationStatus;
        payload.moderationNotes = form.moderationNotes;
      }

      if (editingId) return updateAdminProduct(editingId, payload);
      return createAdminProduct(payload);
    },
    onSuccess: async (result) => {
      toast.success(result.message || (editingId ? 'Product updated' : 'Product created'));
      setEditingId('');
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminProducts });
      await queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
    onError: (err) => toast.error(err.message || 'Failed to save product')
  });

  async function handleMainImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingMain(true);
      const imageUrl = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200 });
      setForm((prev) => ({ ...prev, imageUrl }));
      toast.success('Product image uploaded');
    } catch (_error) {
      toast.error('Product image upload failed');
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
      setForm((prev) => ({ ...prev, galleryText: [...parseGallery(prev.galleryText), ...uploaded].join('\n') }));
      toast.success('Gallery images uploaded');
    } catch (_error) {
      toast.error('Gallery upload failed');
    } finally {
      setIsUploadingGallery(false);
      event.target.value = '';
    }
  }

  if (productsQuery.isLoading) return <AdminShellSkeleton />;
  if (productsQuery.isError) return <ErrorState message="Unable to load products." onRetry={productsQuery.refetch} />;

  const envelope = productsQuery.data || {};
  const products = Array.isArray(envelope.data) ? envelope.data : [];
  const pagination = envelope.pagination || {};
  const filtered = products.filter((p) => (String(p.name || '') + ' ' + String(p.sku || '')).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Product Management" subtitle="Manage catalog, media, and qualifying volume products" />

      <FilterBar>
        <div className="w-full max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search products" /></div>
        <select value={isActiveFilter} onChange={(e) => setIsActiveFilter(e.target.value)} className="rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
          <option value="all">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </FilterBar>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DataTable
            columns={[
              {
                key: 'name',
                title: 'Product',
                className: 'col-span-3',
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <img
                      src={row.image_url || row.gallery?.[0] || 'https://placehold.co/160x160/e2e8f0/475569?text=Product'}
                      alt={row.name || 'Product'}
                      className="h-12 w-12 rounded-xl border border-white/10 object-cover"
                    />
                    <div>
                      <p className="font-medium text-text">{row.name}</p>
                      <p className="text-xs text-muted">{row.category || 'General'}</p>
                    </div>
                  </div>
                )
              },
              { key: 'sku', title: 'SKU', className: 'col-span-2' },
              { key: 'price', title: 'Price', className: 'col-span-2', render: (row) => currency(row.price) },
              { key: 'bv', title: 'BV', className: 'col-span-1', render: (row) => number(row.bv) },
              { key: 'pv', title: 'PV', className: 'col-span-1', render: (row) => number(row.pv) },
              { key: 'moderation_status', title: 'Moderation', className: 'col-span-2', render: (row) => <StatusBadge status={row.moderation_status || 'approved'} /> },
              {
                key: 'action',
                title: 'Action',
                className: 'col-span-1',
                render: (row) => (
                  <button
                    onClick={() => {
                      setEditingId(row.id);
                      setForm({
                        name: row.name || '',
                        sku: row.sku || '',
                        description: row.description || '',
                        price: row.price || '',
                        bv: row.bv || '',
                        category: row.category || 'Digital',
                        imageUrl: row.image_url || '',
                        galleryText: Array.isArray(row.gallery) ? row.gallery.join('\n') : '',
                        isQualifying: !!row.is_qualifying,
                        moderationStatus: row.moderation_status || 'pending',
                        moderationNotes: row.moderation_notes || ''
                      });
                    }}
                    className="rounded-lg bg-white/5 px-2 py-1 text-xs"
                  >
                    Edit
                  </button>
                )
              }
            ]}
            rows={filtered}
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={(pagination.page || 1) <= 1}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => ((pagination.totalPages || 1) > p ? p + 1 : p))}
              disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <ActionPanel title={editingId ? 'Edit Product' : 'Create Product'} description="PV is auto-derived as 40% of BV.">
          <div className="space-y-2">
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} placeholder="SKU" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="Category" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" rows={3} />

            <div className="space-y-2 rounded-xl border border-white/10 bg-cardSoft p-3">
              <input type="file" accept="image/*" onChange={handleMainImageChange} className="w-full text-sm" />
              <input value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="Main image URL or uploaded data URL" className="w-full rounded-xl border border-white/10 bg-card px-3 py-2 text-sm" />
              <input type="file" accept="image/*" multiple onChange={handleGalleryChange} className="w-full text-sm" />
              <textarea value={form.galleryText} onChange={(e) => setForm((p) => ({ ...p, galleryText: e.target.value }))} placeholder="Gallery image URLs, one per line" className="w-full rounded-xl border border-white/10 bg-card px-3 py-2 text-sm" rows={3} />
              <div className="grid grid-cols-2 gap-2">
                <MediaPreview src={form.imageUrl} alt="Main preview" />
                {(gallery[0] ? <MediaPreview src={gallery[0]} alt="Gallery preview" /> : <MediaPreview src="" alt="Gallery preview" />)}
              </div>
            </div>

            <input value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="Price" type="number" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input value={form.bv} onChange={(e) => setForm((p) => ({ ...p, bv: e.target.value }))} placeholder="BV" type="number" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <p className="text-xs text-muted">Computed PV: {number(Number(form.bv || 0) * 0.4)}</p>
            <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={form.isQualifying} onChange={(e) => setForm((p) => ({ ...p, isQualifying: e.target.checked }))} /> Qualifying product</label>
            {editingId ? (
              <>
                <select value={form.moderationStatus} onChange={(e) => setForm((p) => ({ ...p, moderationStatus: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <textarea value={form.moderationNotes} onChange={(e) => setForm((p) => ({ ...p, moderationNotes: e.target.value }))} placeholder="Moderation notes" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" rows={2} />
              </>
            ) : null}
            <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isUploadingMain || isUploadingGallery} className="w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">{isUploadingMain || isUploadingGallery ? 'Uploading...' : saveMutation.isPending ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}</button>
          </div>
        </ActionPanel>
      </div>
    </div>
  );
}
