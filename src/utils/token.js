const jwt = require('jsonwebtoken');
const env = require('../config/env');

function createAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

module.exports = {
  createAuthToken
};
