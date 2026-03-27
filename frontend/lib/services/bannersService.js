import { apiFetch } from '@/lib/api/client';

export async function getHomepageBanners() {
  const data = await apiFetch('/banners');
  return Array.isArray(data) ? data : [];
}
