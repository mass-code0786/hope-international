import { apiFetch } from '@/lib/api/client';

function toEnvelope(payload) {
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return {
      data: payload.data ?? null,
      message: payload.message ?? ''
    };
  }

  return {
    data: payload ?? null,
    message: ''
  };
}

export async function getWelcomeSpinStatus() {
  return toEnvelope(await apiFetch('/users/me/welcome-spin/status'));
}

export async function claimWelcomeSpin() {
  return toEnvelope(
    await apiFetch('/users/me/welcome-spin/claim', {
      method: 'POST',
      body: JSON.stringify({})
    })
  );
}
