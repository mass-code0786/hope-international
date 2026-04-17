import { apiFetch } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';

export async function login(payload) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function register(payload) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getWebauthnRegisterOptions() {
  return apiFetch('/auth/webauthn/register/options', {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function verifyWebauthnRegister(payload) {
  return apiFetch('/auth/webauthn/register/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getWebauthnLoginOptions(payload) {
  return apiFetch('/auth/webauthn/login/options', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function verifyWebauthnLogin(payload) {
  return apiFetch('/auth/webauthn/login/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getWebauthnStatus() {
  return apiFetch('/users/me/webauthn');
}

export async function removeWebauthnCredential(credentialId) {
  return apiFetch(`/users/me/webauthn/${credentialId}`, {
    method: 'DELETE'
  });
}

export async function getReferralPreview(params) {
  const query = new URLSearchParams();
  if (params?.ref) query.set('ref', params.ref);
  if (params?.side) query.set('side', params.side);

  return apiFetch(`/auth/referral-preview?${query.toString()}`);
}

export async function getMe() {
  const data = await apiFetch(API_ROUTES.users.me);
  return data.user || data;
}
