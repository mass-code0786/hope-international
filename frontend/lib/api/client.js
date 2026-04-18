const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:4000';
const API_TIMEOUT_MS = 12_000;
const TOKEN_KEY = 'hope_token';
const RETRYABLE_GET_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const API_ERROR_REASONS = Object.freeze({
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  SERVER: 'server',
  NOT_FOUND: 'not_found'
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(response) {
  const retryAfter = response.headers.get('retry-after');
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(retryAfter);
  if (Number.isFinite(retryAt)) {
    return Math.max(retryAt - Date.now(), 0);
  }

  return null;
}

function getDefaultStatusMessage(status) {
  if (status === 404) return 'Requested service was not found.';
  if (status === 408) return 'The request timed out. Please try again.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'The server could not complete the request. Please try again.';
  return 'Request failed';
}

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

  return data?.message || '';
}

function mergeErrorDetails(details, reason) {
  if (!reason) {
    return details ?? null;
  }

  if (details && typeof details === 'object' && !Array.isArray(details)) {
    return { ...details, reason };
  }

  return { reason };
}

function createApiError(message, { status = null, details = null, reason = null, cause = null } = {}) {
  const error = new Error(message);

  if (status != null) {
    error.status = status;
  }

  error.details = mergeErrorDetails(details, reason);

  if (cause) {
    error.cause = cause;
  }

  return error;
}

function getHttpErrorReason(status) {
  if (status === 404) return API_ERROR_REASONS.NOT_FOUND;
  if (status === 408) return API_ERROR_REASONS.TIMEOUT;
  if (status >= 500) return API_ERROR_REASONS.SERVER;
  return null;
}

export async function apiFetch(path, options = {}, attempt = 0) {
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

  if (typeof window !== 'undefined' && window.navigator?.onLine === false) {
    throw createApiError('Network request failed', {
      status: 0,
      reason: API_ERROR_REASONS.NETWORK
    });
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
    if (error?.name === 'AbortError' && controller.signal.aborted) {
      throw createApiError(getDefaultStatusMessage(408), {
        status: 408,
        reason: API_ERROR_REASONS.TIMEOUT,
        cause: error
      });
    }

    throw createApiError('Network request failed', {
      status: 0,
      reason: API_ERROR_REASONS.NETWORK,
      cause: error
    });
  }

  clearTimeout(timeoutId);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const method = String(options.method || 'GET').toUpperCase();
    if (method === 'GET' && attempt < 2 && RETRYABLE_GET_STATUS_CODES.has(response.status)) {
      const retryAfterMs = parseRetryAfterMs(response);
      const backoffMs = retryAfterMs ?? (response.status === 429 ? 1200 * (attempt + 1) : 500 * (attempt + 1));
      await sleep(backoffMs);
      return apiFetch(path, options, attempt + 1);
    }

    const message = extractApiErrorMessage(data) || getDefaultStatusMessage(response.status);
    throw createApiError(message, {
      status: response.status,
      details: data?.details || null,
      reason: getHttpErrorReason(response.status)
    });
  }

  return data;
}

export { API_BASE_URL };
