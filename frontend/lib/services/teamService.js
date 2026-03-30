import { apiFetch } from '@/lib/api/client';

export async function getTeamChildren() {
  try {
    const data = await apiFetch('/users/me/children');
    return Array.isArray(data) ? data : data.children || [];
  } catch (_error) {
    return [];
  }
}

export async function getTeamSummary() {
  try {
    return await apiFetch('/users/me/team/summary');
  } catch (_error) {
    return {
      total_descendants: 0,
      left_count: 0,
      right_count: 0,
      active_count: 0,
      inactive_count: 0
    };
  }
}
