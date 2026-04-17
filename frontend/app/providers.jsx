'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { getMe } from '@/lib/services/authService';
import { queryKeys } from '@/lib/query/queryKeys';
import { useAuthStore } from '@/lib/store/authStore';
import { applyTheme } from '@/lib/utils/theme';

const CURRENT_USER_BOOTSTRAP_TIMEOUT_MS = 8_000;

function createCurrentUserTimeoutError() {
  const error = new Error('Unable to load your account');
  error.status = 408;
  error.details = { reason: 'current_user_timeout' };
  return error;
}

function AuthBootstrap() {
  const queryClient = useQueryClient();
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrated = useAuthStore((state) => state.hydrated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const currentUserInitialized = useAuthStore((state) => state.currentUserInitialized);
  const currentUserVersion = useAuthStore((state) => state.currentUserVersion);
  const setCurrentUserState = useAuthStore((state) => state.setCurrentUserState);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (!hydrated) return undefined;
    if (!token) {
      inFlightRef.current = false;
      queryClient.removeQueries({ queryKey: queryKeys.me });
      return undefined;
    }
    if (currentUserInitialized && user) {
      inFlightRef.current = false;
      queryClient.setQueryData(queryKeys.me, user);
      return undefined;
    }
    if (inFlightRef.current) return undefined;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    inFlightRef.current = true;
    setCurrentUserState({ status: 'loading', error: null, initialized: false });

    let timeoutId = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => reject(createCurrentUserTimeoutError()), CURRENT_USER_BOOTSTRAP_TIMEOUT_MS);
    });

    Promise.race([getMe(), timeoutPromise])
      .then((currentUser) => {
        if (requestIdRef.current !== requestId) return;
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        inFlightRef.current = false;
        queryClient.setQueryData(queryKeys.me, currentUser);
        setCurrentUserState({ user: currentUser, status: 'ready', error: null, initialized: true });
      })
      .catch((error) => {
        if (requestIdRef.current !== requestId) return;
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        inFlightRef.current = false;
        if (error?.status === 401 || error?.status === 403) {
          clearSession();
          return;
        }
        queryClient.removeQueries({ queryKey: queryKeys.me });
        setCurrentUserState({ user: null, status: 'error', error, initialized: true });
      });

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [clearSession, currentUserInitialized, currentUserVersion, hydrated, queryClient, setCurrentUserState, token, user]);

  return null;
}

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
      <AuthBootstrap />
      {children}
      <Toaster position="top-right" toastOptions={{ style: { background: '#1c1c1c', color: '#f5f5f5' } }} />
    </QueryClientProvider>
  );
}
