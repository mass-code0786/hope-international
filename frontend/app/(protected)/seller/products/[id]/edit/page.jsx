'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SellerGuard } from '@/components/seller/SellerGuard';
import { SellerProductForm } from '@/components/seller/SellerProductForm';
import { SellerStatusBadge } from '@/components/seller/SellerStatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { useSellerProducts } from '@/hooks/useSellerProducts';
import { updateSellerProduct } from '@/lib/services/sellerService';
import { queryKeys } from '@/lib/query/queryKeys';
import { PageLoadingState } from '@/components/ui/PageLoadingState';

function parseGallery(text) {
  return String(text || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function EditSellerProductContent() {
  const params = useParams();
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { products, isLoading, isError, refetch } = useSellerProducts();
  const [form, setForm] = useState(null);

  const product = useMemo(() => products.find((item) => item.id === productId), [products, productId]);

  useEffect(() => {
    if (!product) return;
    setForm({
      sku: product.sku || '',
      name: product.name || '',
      description: product.description || '',
      category: '',
      price: product.price ?? '',
      bv: product.bv ?? '',
      imageUrl: product.image_url || '',
      galleryText: Array.isArray(product.gallery) ? product.gallery.join('\n') : '',
      isQualifying: product.is_qualifying ?? true,
      moderationNotes: product.moderation_notes || ''
    });
  }, [product]);

  const updateMutation = useMutation({
    mutationFn: (payload) => updateSellerProduct(productId, payload),
    onSuccess: async () => {
      toast.success('Product updated and resubmitted for moderation');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sellerMe }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sellerProducts }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products })
      ]);
      router.push('/seller/products');
    },
    onError: (error) => toast.error(error.message || 'Failed to update product')
  });

  async function onSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      price: Number(form.price),
      bv: Number(form.bv),
      imageUrl: form.imageUrl || undefined,
      gallery: parseGallery(form.galleryText),
      moderationNotes: form.category
        ? `${form.moderationNotes ? `${form.moderationNotes}\n` : ''}Category: ${form.category}`
        : form.moderationNotes
    };
    await updateMutation.mutateAsync(payload);
  }

  if (isLoading) return <PageLoadingState title="Edit Seller Product" subtitle="Loading product details for editing." />;
  if (isError) return <ErrorState message="Product details could not be loaded." onRetry={refetch} />;
  if (!product || !form) {
    return (
      <ErrorState
        message="Seller product not found for editing."
        onRetry={() => router.push('/seller/products')}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Edit Seller Product" subtitle="Update details and send for moderation review again" />

      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm text-muted">Current Moderation Status</p>
          <p className="text-sm text-text">{product.name}</p>
        </div>
        <SellerStatusBadge status={product.moderation_status} kind="moderation" />
      </div>

      <SellerProductForm value={form} onChange={setForm} onSubmit={onSubmit} isSubmitting={updateMutation.isPending} submitLabel="Update and Resubmit" />

      <div className="flex justify-end">
        <Link href="/seller/products" className="rounded-xl border border-white/20 px-4 py-2 text-sm text-text">
          Back to Products
        </Link>
      </div>
    </div>
  );
}

export default function EditSellerProductPage() {
  return (
    <SellerGuard>
      <EditSellerProductContent />
    </SellerGuard>
  );
}
