'use client';

import { useCurrentUser } from '@/hooks/useCurrentUser';

export function useSessionUser() {
  return useCurrentUser();
}
