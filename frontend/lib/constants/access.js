export const ROLES = {
  USER: 'user',
  SELLER: 'seller',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
};

export function isAdmin(user) {
  return [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);
}

export function isSeller(user) {
  return [ROLES.SELLER, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);
}

export function canAccessAdminArea(user) {
  return isAdmin(user);
}

export function canAccessSellerArea(user, sellerMe) {
  if (isSeller(user)) return true;
  return Boolean(sellerMe?.canAccessDashboard);
}
