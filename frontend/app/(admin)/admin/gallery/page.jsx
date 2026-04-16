'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AdminSectionHeader } from '@/components/admin/AdminSectionHeader';
import { ActionPanel } from '@/components/admin/ActionPanel';
import { SummaryPanel } from '@/components/admin/SummaryPanel';
import { ErrorState } from '@/components/ui/ErrorState';
import { queryKeys } from '@/lib/query/queryKeys';
import { compressImageFile } from '@/lib/utils/imageUpload';
import { resolveMediaUrl } from '@/lib/utils/media';
import {
  createAdminGalleryItem,
  deleteAdminGalleryItem,
  getAdminGallery,
  updateAdminGalleryItem
} from '@/lib/services/admin';

const emptyForm = {
  title: '',
  caption: '',
  sortOrder: 0,
  isVisible: true,
  imageDataUrl: '',
  previewUrl: ''
};

function TextInput(props) {
  return <input {...props} className={`w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text ${props.className || ''}`} />;
}

function TextArea(props) {
  return <textarea {...props} className={`w-full rounded-xl border border-white/10 bg-cardSoft px-3 py-2 text-sm text-text ${props.className || ''}`} />;
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function validateGalleryImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WEBP files are supported');
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error('Image must be 3MB or smaller');
  }
}

export default function AdminGalleryPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');

  const galleryQuery = useQuery({
    queryKey: queryKeys.adminGallery,
    queryFn: getAdminGallery
  });

  const items = useMemo(() => {
    const payload = galleryQuery.data || {};
    return Array.isArray(payload.data) ? payload.data : [];
  }, [galleryQuery.data]);

  useEffect(() => {
    if (!editingId) {
      setForm(emptyForm);
    }
  }, [editingId]);

  const refreshGallery = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.adminGallery });
    await queryClient.invalidateQueries({ queryKey: queryKeys.publicGallery });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title || undefined,
        caption: form.caption || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        isVisible: Boolean(form.isVisible),
        imageDataUrl: form.imageDataUrl || undefined
      };
      if (!editingId && !payload.imageDataUrl) {
        throw new Error('Gallery image is required');
      }
      return editingId ? updateAdminGalleryItem(editingId, payload) : createAdminGalleryItem(payload);
    },
    onSuccess: async (result) => {
      toast.success(result.message || (editingId ? 'Gallery item updated' : 'Gallery item created'));
      setEditingId('');
      setForm(emptyForm);
      await refreshGallery();
    },
    onError: (error) => toast.error(error.message || 'Failed to save gallery item')
  });

  if (galleryQuery.isLoading) return null;
  if (galleryQuery.isError) return <ErrorState message="Unable to load gallery items." onRetry={galleryQuery.refetch} />;

  const visibleCount = items.filter((item) => item.isVisible).length;

  return (
    <div className="space-y-5">
      <AdminSectionHeader title="Gallery" subtitle="Upload and manage event photos shown only when visitors open the public gallery from the landing page menu." />

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryPanel title="Gallery Summary" items={[
          { label: 'Total items', value: items.length },
          { label: 'Visible items', value: visibleCount },
          { label: 'Hidden items', value: items.length - visibleCount }
        ]} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ActionPanel title={editingId ? 'Edit Gallery Item' : 'Add Gallery Item'} description="Upload event photos with optional title, caption, visibility, and display order.">
          <div className="space-y-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="w-full rounded-xl border border-white/10 bg-card px-3 py-2 text-sm"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  validateGalleryImageFile(file);
                  const imageDataUrl = await compressImageFile(file, {
                    maxWidth: 1800,
                    maxHeight: 1400,
                    mimeType: file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
                  });
                  setForm((prev) => ({ ...prev, imageDataUrl, previewUrl: imageDataUrl }));
                  toast.success('Gallery image ready to save');
                } catch (error) {
                  toast.error(error.message || 'Image upload failed');
                } finally {
                  event.target.value = '';
                }
              }}
            />

            {form.previewUrl ? (
              <img src={resolveMediaUrl(form.previewUrl)} alt={form.title || 'Gallery preview'} className="h-52 w-full rounded-2xl border border-white/10 object-cover" />
            ) : (
              <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#111827] text-sm text-muted">
                No image selected
              </div>
            )}

            <TextInput value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Title (optional)" />
            <TextArea value={form.caption} onChange={(event) => setForm((prev) => ({ ...prev, caption: event.target.value }))} rows={4} placeholder="Caption (optional)" />
            <TextInput type="number" value={form.sortOrder} onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))} placeholder="Sort order" />
            <Toggle label="Visible on public gallery" checked={form.isVisible} onChange={(checked) => setForm((prev) => ({ ...prev, isVisible: checked }))} />

            <div className="flex gap-2">
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-black disabled:opacity-50">
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Gallery Item' : 'Create Gallery Item'}
              </button>
              {editingId ? (
                <button onClick={() => { setEditingId(''); setForm(emptyForm); }} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-muted">
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </ActionPanel>

        <ActionPanel title="Uploaded Gallery Items" description="Visible items appear for public visitors after they open Gallery from the landing page menu.">
          <div className="space-y-3">
            {items.length ? items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-cardSoft p-3">
                <div className="flex gap-3">
                  <img
                    src={resolveMediaUrl(item.imageUrl)}
                    alt={item.title || 'Gallery item'}
                    className="h-24 w-24 rounded-xl border border-white/10 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="truncate text-sm font-semibold text-text">{item.title || 'Untitled photo'}</p>
                        <p className="mt-1 text-xs text-muted">Order {item.sortOrder} • {item.isVisible ? 'Visible' : 'Hidden'}</p>
                        {item.caption ? <p className="mt-2 line-clamp-2 text-xs text-muted">{item.caption}</p> : null}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(item.id);
                            setForm({
                              title: item.title || '',
                              caption: item.caption || '',
                              sortOrder: item.sortOrder || 0,
                              isVisible: Boolean(item.isVisible),
                              imageDataUrl: '',
                              previewUrl: item.imageUrl || ''
                            });
                          }}
                          className="rounded-lg bg-white px-2 py-1 text-xs text-text"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm('Delete this gallery item?')) return;
                            await deleteAdminGalleryItem(item.id);
                            toast.success('Gallery item deleted');
                            await refreshGallery();
                          }}
                          className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-cardSoft px-4 py-10 text-center text-sm text-muted">
                No gallery items yet
              </div>
            )}
          </div>
        </ActionPanel>
      </div>
    </div>
  );
}
