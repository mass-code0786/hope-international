import { apiFetch } from '@/lib/api/client';

function toEnvelope(payload) {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
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

export async function createNowPaymentsPayment(payload) {
  return toEnvelope(
    await apiFetch('/wallet/deposits/nowpayments', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function getPaymentDetail(id) {
  return toEnvelope(await apiFetch(`/wallet/deposits/nowpayments/${id}`));
}

export async function syncPaymentDetail(id) {
  return toEnvelope(
    await apiFetch(`/payments/${id}/sync`, {
      method: 'POST',
      body: JSON.stringify({})
    })
  );
}
