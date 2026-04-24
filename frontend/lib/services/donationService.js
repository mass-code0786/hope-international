import { apiFetch } from '@/lib/api/client';

function toEnvelope(payload) {
  if (payload && typeof payload === 'object' && Array.isArray(payload.items)) {
    return {
      data: payload.items,
      pagination: payload.pagination ?? null,
      summary: payload.summary ?? null,
      message: payload.message ?? ''
    };
  }

  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data.items)) {
      return {
        data: payload.data.items,
        pagination: payload.data.pagination ?? payload.pagination ?? null,
        summary: payload.summary ?? null,
        message: payload.message ?? ''
      };
    }

    return {
      data: payload.data ?? null,
      pagination: payload.pagination ?? null,
      summary: payload.summary ?? null,
      message: payload.message ?? ''
    };
  }

  return {
    data: payload ?? null,
    pagination: null,
    summary: null,
    message: ''
  };
}

function withQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

function normalizeDonation(item) {
  return {
    ...item,
    amount: Number(item?.amount || 0)
  };
}

export async function createDonation(payload) {
  return toEnvelope(
    await apiFetch('/donations', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function getMyDonations(params = {}) {
  const envelope = toEnvelope(await apiFetch(`/donations/my${withQuery(params)}`));
  return {
    ...envelope,
    data: Array.isArray(envelope.data) ? envelope.data.map(normalizeDonation) : [],
    pagination: envelope.pagination || {
      page: Number(params.page || 1),
      limit: Number(params.limit || 20),
      total: 0
    }
  };
}
