const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError } = require('../utils/ApiError');

function auth(required = true) {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (required) {
        return next(new ApiError(401, 'Authorization token is required'));
      }
      return next();
    }

    try {
      req.user = jwt.verify(token, env.jwtSecret);
      return next();
    } catch (_error) {
      return next(new ApiError(401, 'Invalid or expired token'));
    }
  };
}

function requireAdmin(req, _res, next) {
  if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
    return next(new ApiError(403, 'Admin access required'));
  }
  return next();
}

async function requireSeller(req, _res, next) {
  if (!req.user) {
    return next(new ApiError(403, 'Seller access required'));
  }

  if (['seller', 'admin', 'super_admin'].includes(req.user.role)) {
    return next();
  }

  if (req.user.role === 'user') {
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
  requireSeller
};
