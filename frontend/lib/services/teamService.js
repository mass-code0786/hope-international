import { apiFetch } from '@/lib/api/client';

export async function getTeamChildren() {
  try {
    const data = await apiFetch('/users/me/children');
    return Array.isArray(data) ? data : data.children || [];
  } catch (_error) {
    return [];
  }
}
