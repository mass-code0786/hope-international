import { apiFetch } from '@/lib/api/client';
import { buildDemoSession, getStoredDemoSession } from '@/lib/utils/demoSession';

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

export async function demoLogin(role) {
  return buildDemoSession(role);
}

export async function getMe() {
  const demoSession = getStoredDemoSession();
  if (demoSession?.user?.is_demo) {
    return demoSession.user;
  }

  const data = await apiFetch('/users/me');
  return data.user || data;
}
