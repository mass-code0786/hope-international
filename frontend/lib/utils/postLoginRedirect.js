import { canAccessAdminArea, isSeller } from '@/lib/constants/access';

export function getPostLoginRoute(user) {
  if (canAccessAdminArea(user)) return '/admin';
  if (isSeller(user)) return '/seller';
  return '/dashboard';
}
