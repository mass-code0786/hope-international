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
    const data = await apiFetch('/users/me/team/summary');
    if (process.env.NODE_ENV !== 'production') {
      console.info('[team.frontend] raw-summary-response', data);
    }
    return data;
  } catch (_error) {
    return {
      total_descendants: 0,
      left_team_count: 0,
      right_team_count: 0,
      active_count: 0,
      inactive_count: 0,
      left_pv: 0,
      right_pv: 0,
      matched_potential: 0,
      direct_referral_count: 0,
      direct_binary_count: 0
    };
  }
}

export async function getTeamTreeRoot() {
  return apiFetch('/users/me/team/tree');
}

export async function getTeamTreeNode(memberId) {
  return apiFetch(`/users/me/team/tree/${memberId}`);
}
