import { apiFetch } from '@/lib/api/client';

function withQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

function normalizeBannerParams(params = {}) {
  const next = {};
  const limit = Number(params.limit);
  next.limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 10;
  return next;
}

export async function getHomepageBanners(params = {}) {
  const data = await apiFetch(`/banners${withQuery(normalizeBannerParams(params))}`);
  return Array.isArray(data) ? data : [];
}
