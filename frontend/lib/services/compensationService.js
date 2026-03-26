import { apiFetch } from '@/lib/api/client';

export async function getWeeklyCompensation(params) {
  const query = new URLSearchParams(params).toString();
  const data = await apiFetch(`/users/me/compensation/weekly?${query}`);
  return data.summary || data;
}

export async function getMonthlyCompensation(params) {
  const query = new URLSearchParams(params).toString();
  const data = await apiFetch(`/users/me/compensation/monthly?${query}`);
  return data.summary || data;
}
