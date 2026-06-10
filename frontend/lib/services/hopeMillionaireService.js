import { apiFetch } from '@/lib/api/client';

function toEnvelope(payload) {
  return payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? { data: payload.data ?? null, message: payload.message || '' }
    : { data: payload ?? null, message: '' };
}

export async function getHopeMillionaireDashboard() {
  return toEnvelope(await apiFetch('/hope-millionaire'));
}

export async function joinHopeMillionairePackage(packageAmount) {
  return toEnvelope(await apiFetch('/hope-millionaire/join', {
    method: 'POST',
    body: JSON.stringify({
      packageAmount,
      requestId: crypto.randomUUID()
    })
  }));
}
