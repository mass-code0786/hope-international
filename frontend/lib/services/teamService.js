import { apiFetch } from '@/lib/api/client';
import { demoTeamChildren } from '@/lib/demo/mockData';
import { isDemoSessionActive } from '@/lib/utils/demoSession';

export async function getTeamChildren() {
  if (isDemoSessionActive()) return demoTeamChildren;
  try {
    const data = await apiFetch('/users/me/children');
    return Array.isArray(data) ? data : data.children || [];
  } catch (_error) {
    return [];
  }
}
