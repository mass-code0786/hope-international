import { apiFetch } from '@/lib/api/client';

export async function getPublicLandingPage() {
  const payload = await apiFetch('/landing/public');
  return payload.data || payload;
}

export async function getPublicGallery() {
  const payload = await apiFetch('/gallery');
  return payload.data || payload;
}

export async function trackLandingVisit(visitorToken) {
  const payload = await apiFetch('/landing/visit', {
    method: 'POST',
    body: JSON.stringify({ visitorToken })
  });
  return payload.data || payload;
}
