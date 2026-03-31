const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError } = require('../utils/ApiError');

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function auth(required = true) {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (required) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[auth] missing token', { path: req.originalUrl });
        }
        return next(new ApiError(401, 'Authorization token is required'));
      }
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      req.user = {
        ...decoded,
        role: normalizeRole(decoded.role)
      };
      if (process.env.NODE_ENV !== 'production') {
        console.info('[auth] decoded token role', { path: req.originalUrl, username: req.user.username, role: req.user.role });
      }
      return next();
    } catch (_error) {
      return next(new ApiError(401, 'Invalid or expired token'));
    }
  };
}

function requireAdmin(req, _res, next) {
  const role = normalizeRole(req.user?.role);
  if (!req.user || !['admin', 'super_admin'].includes(role)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] admin access denied', { path: req.originalUrl, username: req.user?.username, role });
    }
    return next(new ApiError(403, 'Admin access required'));
  }
  return next();
}

function requireSuperAdmin(req, _res, next) {
  const role = normalizeRole(req.user?.role);
  if (!req.user || role !== 'super_admin') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] super admin access denied', { path: req.originalUrl, username: req.user?.username, role });
    }
    return next(new ApiError(403, 'Super admin access required'));
  }
  return next();
}

async function requireSeller(req, _res, next) {
  const role = normalizeRole(req.user?.role);
  if (!req.user) {
    return next(new ApiError(403, 'Seller access required'));
  }

  if (['seller', 'admin', 'super_admin'].includes(role)) {
    return next();
  }

  if (role === 'user') {
    try {
      const sellerRepository = require('../repositories/sellerRepository');
      const profile = await sellerRepository.getSellerProfileByUserId(null, req.user.sub);
      if (profile?.application_status === 'approved') {
        return next();
      }
    } catch (error) {
      return next(error);
    }
  }

  return next(new ApiError(403, 'Seller access required'));
}

module.exports = {
  auth,
  requireAdmin,
  requireSuperAdmin,
  requireSeller,
  normalizeRole
};
