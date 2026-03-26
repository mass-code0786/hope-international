'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProductFilters } from '@/components/shop/ProductFilters';
import { ProductCard } from '@/components/shop/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ShopSkeleton } from '@/components/ui/PageSkeletons';
import { useProducts } from '@/hooks/useProducts';
import { createOrder } from '@/lib/services/ordersService';
import { queryKeys } from '@/lib/query/queryKeys';
import { useAuthStore } from '@/lib/store/authStore';
import { isDemoUser } from '@/lib/utils/demoMode';

export default function ShopPage() {
  const { data, isLoading, isError, refetch } = useProducts();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [buyingProductId, setBuyingProductId] = useState('');
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const demoMode = isDemoUser(user);

  const buyMutation = useMutation({
    mutationFn: (product) => createOrder({ items: [{ productId: product.id, quantity: 1 }] }),
    onMutate: (product) => {
      setBuyingProductId(product?.id || '');
    },
    onSuccess: async () => {
      toast.success('Order placed successfully. Dashboard is updating.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet }),
        queryClient.invalidateQueries({ queryKey: queryKeys.me }),
        queryClient.invalidateQueries({ queryKey: queryKeys.weeklyCompensationRoot }),
        queryClient.invalidateQueries({ queryKey: queryKeys.monthlyCompensationRoot })
      ]);
    },
    onError: (error) => toast.error(error.message || 'Order failed. Please try again.'),
    onSettled: () => setBuyingProductId('')
  });

  const products = Array.isArray(data) ? data : [];

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const text = `${product?.name || ''} ${product?.description || ''}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      if (activeCategory === 'All') return matchesSearch;
      return matchesSearch && text.includes(activeCategory.toLowerCase());
    });
  }, [products, search, activeCategory]);

  return (
    <div className="space-y-5">
      <SectionHeader title="Premium Shop" subtitle="Discover high-value qualifying products" />
      <ProductFilters search={search} setSearch={setSearch} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
      {demoMode ? <p className="text-xs text-amber-300">Demo mode is active. Real order placement is disabled.</p> : null}

      {isLoading ? <ShopSkeleton /> : null}
      {isError ? <ErrorState message="Products could not be loaded. Please check your connection and retry." onRetry={refetch} /> : null}

      {!isLoading && !isError && filtered.length === 0 ? (
        <EmptyState title="No matching products" description="Try different keywords or switch categories to discover more offers." />
      ) : null}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onBuy={(p) => buyMutation.mutate(p)}
            isBuying={buyMutation.isPending && buyingProductId === product.id}
            disableBuying={demoMode}
          />
        ))}
      </div>
    </div>
  );
}
