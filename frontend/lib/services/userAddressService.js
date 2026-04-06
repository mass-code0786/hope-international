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

export async function getUserAddress() {
  return toEnvelope(await apiFetch('/users/me/address'));
}

export async function createUserAddress(payload) {
  return toEnvelope(
    await apiFetch('/users/me/address', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  );
}

export async function updateUserAddress(payload) {
  return toEnvelope(
    await apiFetch('/users/me/address', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  );
}
