import { API_BASE_URL } from '@/lib/api/client';

export function resolveMediaUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized) || normalized.startsWith('data:')) {
    return normalized;
  }
  if (normalized.startsWith('/')) {
    return `${API_BASE_URL}${normalized}`;
  }
  return normalized;
}
