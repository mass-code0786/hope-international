import { apiFetch } from '@/lib/api/client';

function unwrap(payload) {
  if (!payload) return payload;
  if (payload.data && typeof payload.data === 'object') return payload.data;
  return payload;
}

export async function applyForSeller(payload) {
  const data = await apiFetch('/seller/apply', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return unwrap(data);
}

export async function getSellerMe() {
  const data = await apiFetch('/seller/me');
  const unwrapped = unwrap(data) || {};

  return {
    profile: unwrapped.profile || null,
    documents: Array.isArray(unwrapped.documents) ? unwrapped.documents : [],
    products: Array.isArray(unwrapped.products) ? unwrapped.products : [],
    summary: unwrapped.summary || null,
    canAccessDashboard: Boolean(unwrapped.canAccessDashboard)
  };
}

export async function createSellerProduct(payload) {
  const data = await apiFetch('/seller/products', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return unwrap(data);
}

export async function updateSellerProduct(productId, payload) {
  const data = await apiFetch(`/seller/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return unwrap(data);
}
