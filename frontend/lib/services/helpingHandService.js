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

function normalizeApplication(item) {
  return {
    ...item,
    requested_amount: Number(item?.requested_amount || 0)
  };
}

export async function getHelpingHandEligibility() {
  const envelope = toEnvelope(await apiFetch('/helping-hand/eligibility'));
  const data = envelope.data || {};

  return {
    ...envelope,
    data: {
      eligible: Boolean(data.eligible),
      totalDeposit: Number(data.totalDeposit || 0),
      requiredDeposit: Number(data.requiredDeposit || 1000)
    }
  };
}

export async function createHelpingHandApplication(payload) {
  return toEnvelope(
    await apiFetch('/helping-hand/applications', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function getMyHelpingHandApplications(params = {}) {
  const envelope = toEnvelope(await apiFetch(`/helping-hand/my-applications${withQuery(params)}`));
  return {
    ...envelope,
    data: Array.isArray(envelope.data) ? envelope.data.map(normalizeApplication) : [],
    pagination: envelope.pagination || {
      page: Number(params.page || 1),
      limit: Number(params.limit || 20),
      total: 0
    }
  };
}
