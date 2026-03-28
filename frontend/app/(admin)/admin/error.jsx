'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

export default function AdminRouteError({ error, reset }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[frontend.admin.route] page failure', error);
    }
  }, [error]);

  return <ErrorState message="This admin page couldn't load." onRetry={reset} />;
}