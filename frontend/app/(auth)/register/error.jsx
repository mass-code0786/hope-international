'use client';

import { useEffect } from 'react';
import { RegistrationFallback } from '@/components/auth/RegisterErrorBoundary';

export default function RegisterRouteError({ error }) {
  useEffect(() => {
    console.error('[registration.page] route error', error);
  }, [error]);

  return <RegistrationFallback />;
}
