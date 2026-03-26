const dotenv = require('dotenv');

dotenv.config();

function getEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

function getBoolEnv(name, fallback) {
  const value = String(process.env[name] ?? fallback).toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

module.exports = {
  port: Number(getEnv('PORT', 4000)),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  databaseUrl: getEnv('DATABASE_URL'),
  jwtSecret: getEnv('JWT_SECRET'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
  demoModeEnabled: getBoolEnv('DEMO_MODE_ENABLED', process.env.NODE_ENV === 'production' ? 'false' : 'true'),
  demoUserEmail: getEnv('DEMO_USER_EMAIL', 'alice@hope.local'),
  demoSellerEmail: getEnv('DEMO_SELLER_EMAIL', 'seller.approved@hope.local'),
  demoAdminEmail: getEnv('DEMO_ADMIN_EMAIL', 'admin@hope.local')
};
