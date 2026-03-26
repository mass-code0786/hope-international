import { apiFetch } from '@/lib/api/client';
import { demoOrders } from '@/lib/demo/mockData';
import { isDemoSessionActive } from '@/lib/utils/demoSession';

export async function createOrder(payload) {
  if (isDemoSessionActive()) {
    throw new Error('Order placement is disabled in demo mode');
  }
  return apiFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getOrders() {
  if (isDemoSessionActive()) return demoOrders;
  const data = await apiFetch('/orders');
  return Array.isArray(data) ? data : data.orders || [];
}
