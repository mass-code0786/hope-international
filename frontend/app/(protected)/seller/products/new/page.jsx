'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SellerGuard } from '@/components/seller/SellerGuard';
import { SellerProductForm } from '@/components/seller/SellerProductForm';
import { createSellerProduct } from '@/lib/services/sellerService';
import { queryKeys } from '@/lib/query/queryKeys';

const initialState = {
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

function parseGallery(text) {
  return String(text || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function CreateSellerProductContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialState);

  const createMutation = useMutation({
    mutationFn: createSellerProduct,
    onSuccess: async () => {
      toast.success('Product submitted for moderation');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sellerMe }),
        queryClient.invalidateQueries({ queryKey: queryKeys.sellerProducts }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products })
      ]);
      router.push('/seller/products');
    },
    onError: (error) => toast.error(error.message || 'Failed to submit product')
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
    await createMutation.mutateAsync(payload);
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Create Seller Product" subtitle="Submit a product for admin moderation before it goes live" />
      <SellerProductForm value={form} onChange={setForm} onSubmit={onSubmit} isSubmitting={createMutation.isPending} submitLabel="Submit for Approval" />
    </div>
  );
}

export default function NewSellerProductPage() {
  return (
    <SellerGuard>
      <CreateSellerProductContent />
    </SellerGuard>
  );
}
