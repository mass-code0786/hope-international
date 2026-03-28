'use client';

import { useState } from 'react';
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
import {
  createAdminBanner,
  deleteAdminBanner,
  getAdminBanners,
  updateAdminBanner
} from '@/lib/services/admin';

const initialForm = {
  imageUrl: '',
  title: '',
  subtitle: '',
  ctaText: '',
  targetLink: '',
  sortOrder: 0,
  isActive: true,
  startAt: '',
  endAt: ''
};

function toLocalDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file) {
  const src = await fileToDataUrl(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxWidth = 1200;
      const maxHeight = 500;
      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const width = Math.max(1, Math.floor(image.width * ratio));
      const height = Math.max(1, Math.floor(image.height * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Unable to process image'));
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.84));
    };
    image.onerror = reject;
    image.src = src;
  });
}

export default function AdminBannersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isActiveFilter, setIsActiveFilter] = useState('all');
  const [editingId, setEditingId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const queryClient = useQueryClient();

  const bannersQuery = useQuery({
    queryKey: [...queryKeys.adminBanners, search, page, isActiveFilter],
    queryFn: () => getAdminBanners({ search, page, limit: 10, isActive: isActiveFilter })
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        imageUrl: form.imageUrl,
        title: form.title,
        subtitle: form.subtitle || undefined,
        ctaText: form.ctaText || undefined,
        targetLink: form.targetLink || undefined,
        sortOrder: Number(form.sortOrder || 0),
        isActive: Boolean(form.isActive),
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined
      };

      if (editingId) return updateAdminBanner(editingId, payload);
      return createAdminBanner(payload);
    },
    onSuccess: async (result) => {
      toast.success(result.message || (editingId ? 'Banner updated' : 'Banner created'));
      setEditingId('');
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminBanners });
      await queryClient.invalidateQueries({ queryKey: queryKeys.homepageBanners });
    },
    onError: (error) => toast.error(error.message || 'Failed to save banner')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAdminBanner(id),
    onSuccess: async () => {
      toast.success('Banner deleted');
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminBanners });
      await queryClient.invalidateQueries({ queryKey: queryKeys.homepageBanners });
    },
    onError: (error) => toast.error(error.message || 'Failed to delete banner')
  });

  if (bannersQuery.isLoading) return <AdminShellSkeleton />;
  if (bannersQuery.isError) return <ErrorState message="Unable to load banners." onRetry={bannersQuery.refetch} />;

  const envelope = bannersQuery.data || {};
  const banners = Array.isArray(envelope.data) ? envelope.data : [];
  const pagination = envelope.pagination || {};

  const filtered = banners.filter((banner) => (String(banner.title || '') + ' ' + String(banner.subtitle || '')).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Homepage Banners" subtitle="Manage mobile storefront offer banners and campaign ordering" />

      <FilterBar>
        <div className="w-full max-w-sm"><SearchInput value={search} onChange={setSearch} placeholder="Search banners" /></div>
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
                key: 'preview',
                title: 'Preview',
                className: 'col-span-3',
                render: (row) => (
                  <div className="space-y-1">
                    <img src={row.image_url} alt={row.title || 'Banner'} className="h-16 w-full rounded-lg border border-white/10 object-cover" />
                    <p className="text-xs font-semibold text-text">{row.title}</p>
                  </div>
                )
              },
              { key: 'subtitle', title: 'Subtitle', className: 'col-span-2', render: (row) => row.subtitle || '-' },
              { key: 'sort_order', title: 'Order', className: 'col-span-1' },
              { key: 'is_active', title: 'Status', className: 'col-span-2', render: (row) => (row.is_active ? 'Active' : 'Inactive') },
              { key: 'start_at', title: 'Window', className: 'col-span-2', render: (row) => `${row.start_at ? new Date(row.start_at).toLocaleDateString() : 'Always'} - ${row.end_at ? new Date(row.end_at).toLocaleDateString() : 'Open'}` },
              {
                key: 'action',
                title: 'Action',
                className: 'col-span-2',
                render: (row) => (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingId(row.id);
                        setForm({
                          imageUrl: row.image_url || '',
                          title: row.title || '',
                          subtitle: row.subtitle || '',
                          ctaText: row.cta_text || '',
                          targetLink: row.target_link || '',
                          sortOrder: row.sort_order || 0,
                          isActive: Boolean(row.is_active),
                          startAt: toLocalDateTimeInput(row.start_at),
                          endAt: toLocalDateTimeInput(row.end_at)
                        });
                      }}
                      className="rounded-lg bg-white/5 px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button onClick={() => deleteMutation.mutate(row.id)} className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-200">
                      Delete
                    </button>
                  </div>
                )
              }
            ]}
            rows={filtered}
          />

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={(pagination.page || 1) <= 1}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((prev) => ((pagination.totalPages || 1) > prev ? prev + 1 : prev))}
              disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <ActionPanel title={editingId ? 'Edit Banner' : 'Create Banner'} description="Upload image, set CTA and active display window.">
          <div className="space-y-2">
            <div className="space-y-1">
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  try {
                    setIsUploading(true);
                    const compressed = await compressImage(file);
                    setForm((prev) => ({ ...prev, imageUrl: compressed }));
                    toast.success('Image uploaded');
                  } catch (_error) {
                    toast.error('Image upload failed');
                  } finally {
                    setIsUploading(false);
                    event.target.value = '';
                  }
                }}
                className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm"
              />
              <input
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="Banner image URL or uploaded data URL"
                className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm"
              />
              {form.imageUrl ? <img src={form.imageUrl} alt="Banner preview" className="h-24 w-full rounded-lg border border-white/10 object-cover" /> : null}
            </div>

            <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <textarea value={form.subtitle} onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))} placeholder="Subtitle" rows={2} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input value={form.ctaText} onChange={(e) => setForm((prev) => ({ ...prev, ctaText: e.target.value }))} placeholder="CTA text (optional)" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input value={form.targetLink} onChange={(e) => setForm((prev) => ({ ...prev, targetLink: e.target.value }))} placeholder="Target link (/shop, /profile, https://...)" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <input value={form.sortOrder} onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))} placeholder="Sort order" type="number" className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} /> Active</label>

            <div className="grid grid-cols-2 gap-2">
              <input type="datetime-local" value={form.startAt} onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
              <input type="datetime-local" value={form.endAt} onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm" />
            </div>

            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isUploading || !form.imageUrl || !form.title}
              className="w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : saveMutation.isPending ? 'Saving...' : editingId ? 'Update Banner' : 'Create Banner'}
            </button>
          </div>
        </ActionPanel>
      </div>
    </div>
  );
}
