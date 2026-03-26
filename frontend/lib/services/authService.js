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

export async function getMe() {
  const data = await apiFetch('/users/me');
  return data.user || data;
}
