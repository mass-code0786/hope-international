import { apiFetch } from '@/lib/api/client';
import { demoMonthlyCompensation, demoWeeklyCompensation } from '@/lib/demo/mockData';
import { isDemoSessionActive } from '@/lib/utils/demoSession';

export async function getWeeklyCompensation(params) {
  if (isDemoSessionActive()) return demoWeeklyCompensation;
  const query = new URLSearchParams(params).toString();
  const data = await apiFetch(`/users/me/compensation/weekly?${query}`);
  return data.summary || data;
}

export async function getMonthlyCompensation(params) {
  if (isDemoSessionActive()) return demoMonthlyCompensation;
  const query = new URLSearchParams(params).toString();
  const data = await apiFetch(`/users/me/compensation/monthly?${query}`);
  return data.summary || data;
}
