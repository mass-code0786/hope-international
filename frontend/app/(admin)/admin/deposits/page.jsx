'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDepositsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/nowpayments');
  }, [router]);

  return null;
}
