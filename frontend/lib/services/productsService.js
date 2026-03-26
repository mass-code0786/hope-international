import { apiFetch } from '@/lib/api/client';

export async function getProducts() {
  const data = await apiFetch('/products');
  return Array.isArray(data) ? data : data.products || [];
}
