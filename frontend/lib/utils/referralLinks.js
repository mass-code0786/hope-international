const PRODUCTION_SITE_URL = 'https://www.hopeinternational.uk';

const configuredBaseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  PRODUCTION_SITE_URL;

function isLocalhostUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch (_error) {
    return false;
  }
}

export const BASE_URL = isLocalhostUrl(configuredBaseUrl) ? PRODUCTION_SITE_URL : configuredBaseUrl;

export const NORMALIZED_BASE_URL = BASE_URL.replace(/\/+$/, '');

export function buildReferralLink(refCode, side) {
  return `${NORMALIZED_BASE_URL}/register?ref=${encodeURIComponent(refCode)}&side=${side}`;
}

export function buildReferralLinks(refCode) {
  return {
    left: buildReferralLink(refCode, 'left'),
    right: buildReferralLink(refCode, 'right')
  };
}
