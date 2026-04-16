'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { applyTheme } from '@/lib/utils/theme';

export function Providers({ children }) {
  const [queryClient] = useState(() =>
    {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 90_000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false
          }
        }
      });

      client.setQueryDefaults(['me'], {
        retry: false,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false
      });

      return client;
    }
  );

  useEffect(() => {
    applyTheme('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" toastOptions={{ style: { background: '#1c1c1c', color: '#f5f5f5' } }} />
    </QueryClientProvider>
  );
}
