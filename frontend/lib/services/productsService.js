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

function normalizeProductParams(params = {}) {
  const next = {};
  if (params.active !== undefined) next.active = params.active;
  if (typeof params.category === 'string' && params.category.trim()) next.category = params.category.trim();
  const page = Number(params.page);
  if (Number.isInteger(page) && page > 0) next.page = page;
  const limit = Number(params.limit);
  next.limit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  return next;
}

export async function getProducts(params = {}) {
  const data = await apiFetch(`/products${withQuery(normalizeProductParams(params))}`);
  if (Array.isArray(data)) {
    return {
      data,
      pagination: null,
      message: ''
    };
  }

  return {
    data: Array.isArray(data?.data) ? data.data : Array.isArray(data?.products) ? data.products : [],
    pagination: data?.pagination || null,
    message: data?.message || ''
  };
}

export async function getProductsList(params = {}) {
  const envelope = await getProducts(params);
  return envelope.data;
}

export async function getProductDetail(id) {
  return apiFetch(`/products/${id}`);
}
