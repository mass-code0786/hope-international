import { apiFetch } from '@/lib/api/client';

export async function createOrder(payload) {
  return apiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getOrders() {
  const data = await apiFetch('/orders');
  return Array.isArray(data) ? data : data.orders || [];
}
