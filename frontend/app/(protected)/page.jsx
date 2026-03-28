'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function ProtectedRootPage() {
  const router = useRouter();
  const { user, hydrated, hydrate } = useAuthStore();

  useEffect(() => {
    if (!hydrated) {
      hydrate();
      return;
    }

    if (user?.role === 'admin') {
      router.replace('/admin');
      return;
    }

    if (user?.role === 'seller') {
      router.replace('/seller');
      return;
    }

    router.replace('/auctions');
  }, [user, hydrated, hydrate, router]);

  return <div className="card-surface p-4 text-sm text-muted">Redirecting to your workspace...</div>;
}
