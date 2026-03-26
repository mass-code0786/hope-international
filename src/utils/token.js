const jwt = require('jsonwebtoken');
const env = require('../config/env');

function createAuthToken(user) {
  return createAuthTokenWithOptions(user, {});
}

function createAuthTokenWithOptions(user, options = {}) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      is_demo: Boolean(options.isDemo)
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

module.exports = {
  createAuthToken,
  createAuthTokenWithOptions
};
