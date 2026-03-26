import { apiFetch } from '@/lib/api/client';
import { demoProducts } from '@/lib/demo/mockData';
import { isDemoSessionActive } from '@/lib/utils/demoSession';

export async function getProducts() {
  if (isDemoSessionActive()) return demoProducts;
  const data = await apiFetch('/products');
  return Array.isArray(data) ? data : data.products || [];
}
