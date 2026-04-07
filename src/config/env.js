const dotenv = require('dotenv');

dotenv.config();

function getEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: Number(getEnv('PORT', 4000)),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  databaseUrl: getEnv('DATABASE_URL'),
  jwtSecret: getEnv('JWT_SECRET'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
  jwtRememberMeExpiresIn: getEnv('JWT_REMEMBER_ME_EXPIRES_IN', '30d'),
  webAuthnRpName: getEnv('WEBAUTHN_RP_NAME', 'Hope International'),
  webAuthnRpId: process.env.WEBAUTHN_RP_ID || '',
  webAuthnOrigin: process.env.WEBAUTHN_ORIGIN || ''
};
