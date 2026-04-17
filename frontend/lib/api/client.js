const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:4000';
const API_TIMEOUT_MS = 12_000;
const TOKEN_KEY = 'hope_token';

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
  const token = typeof window === 'undefined'
    ? null
    : window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const mergedSignal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      cache: 'no-store',
      signal: mergedSignal
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Unable to load data');
      timeoutError.status = 408;
      timeoutError.details = { reason: 'timeout' };
      throw timeoutError;
    }
    throw error;
  }

  clearTimeout(timeoutId);

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
