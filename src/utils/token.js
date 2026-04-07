const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { normalizeRole } = require('../middleware/auth');

function createAuthToken(user, options = {}) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: normalizeRole(user.role)
    },
    env.jwtSecret,
    { expiresIn: options.rememberMe ? env.jwtRememberMeExpiresIn : env.jwtExpiresIn }
  );
}

module.exports = {
  createAuthToken
};
