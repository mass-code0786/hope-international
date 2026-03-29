'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';

export default function ProtectedLayout({ children }) {
  const pathname = usePathname();

  if (pathname === '/') {
    return children;
  }

  return <AppShell>{children}</AppShell>;
}
