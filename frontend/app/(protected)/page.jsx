'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { canAccessAdminArea, isSeller } from '@/lib/constants/access';

export default function ProtectedRootPage() {
  const router = useRouter();
  const { user, hydrated, hydrate } = useAuthStore();

  useEffect(() => {
    if (!hydrated) {
      hydrate();
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.info('[frontend.protected.root] currentUser role', { username: user?.username, role: user?.role });
    }

    if (canAccessAdminArea(user)) {
      router.replace('/admin');
      return;
    }

    if (isSeller(user)) {
      router.replace('/seller');
      return;
    }

    router.replace('/auctions');
  }, [user, hydrated, hydrate, router]);

  return <div className="card-surface p-4 text-sm text-muted">Redirecting to your workspace...</div>;
}
