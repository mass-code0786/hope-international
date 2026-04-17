import { apiFetch } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';

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
    await apiFetch(API_ROUTES.wallet.nowpayments.create, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function getPaymentDetail(id) {
  return toEnvelope(await apiFetch(API_ROUTES.wallet.nowpayments.detail(id)));
}

export async function syncPaymentDetail(id) {
  return toEnvelope(
    await apiFetch(API_ROUTES.wallet.nowpayments.sync(id), {
      method: 'POST',
      body: JSON.stringify({})
    })
  );
}
