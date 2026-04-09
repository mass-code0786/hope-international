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
  webAuthnOrigin: process.env.WEBAUTHN_ORIGIN || '',
  appBaseUrl: process.env.APP_BASE_URL || '',
  mediaStorageRoot: process.env.MEDIA_STORAGE_ROOT || '',
  mediaPublicPath: process.env.MEDIA_PUBLIC_PATH || '/media',
  mediaPublicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL || '',
  nowPaymentsApiBaseUrl: process.env.NOWPAYMENTS_API_BASE_URL || 'https://api.nowpayments.io/v1',
  nowPaymentsApiKey: process.env.NOWPAYMENTS_API_KEY || '',
  nowPaymentsIpnSecret: process.env.NOWPAYMENTS_IPN_SECRET || '',
  nowPaymentsWebhookPublicUrl: process.env.NOWPAYMENTS_WEBHOOK_PUBLIC_URL || ''
};
