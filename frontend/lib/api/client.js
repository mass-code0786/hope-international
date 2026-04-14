import { getStoredToken } from '@/lib/utils/tokenStorage';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:4000';

function extractApiErrorMessage(data) {
  const formError = data?.details?.formErrors?.find((msg) => typeof msg === 'string' && msg.trim());
  if (formError) {
    return formError;
  }

  const fieldErrors = data?.details?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    for (const value of Object.values(fieldErrors)) {
      if (Array.isArray(value) && value[0]) {
        return value[0];
      }
    }
  }

  return data?.message || 'Request failed';
}

export async function apiFetch(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(extractApiErrorMessage(data));
    error.status = response.status;
    error.details = data?.details || null;
    throw error;
  }

  return data;
}

export { API_BASE_URL };
