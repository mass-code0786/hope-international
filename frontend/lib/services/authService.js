import { apiFetch } from '@/lib/api/client';

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

export async function getReferralPreview(params) {
  const query = new URLSearchParams();
  if (params?.ref) query.set('ref', params.ref);
  if (params?.side) query.set('side', params.side);

  return apiFetch(`/auth/referral-preview?${query.toString()}`);
}

export async function getMe() {
  const data = await apiFetch('/users/me');
  return data.user || data;
}
