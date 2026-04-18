'use client';

export const REGISTRATION_REFERRAL_REQUIRED_MESSAGE = 'Referral link/code is required for registration';

export function normalizePlacementSide(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'left' || normalized === 'right' ? normalized : '';
}

export function formatPlacementSideLabel(side) {
  if (!side) return 'Not selected';
  return `${String(side).charAt(0).toUpperCase()}${String(side).slice(1)} side`;
}

export function extractReferralQueryContext(searchParams) {
  return {
    referralCode: String(searchParams?.get('ref') || searchParams?.get('sponsor') || '').trim(),
    requestedSide: normalizePlacementSide(searchParams?.get('side'))
  };
}

export function extractReferralInputContext(value) {
  const text = String(value || '').trim();
  if (!text) {
    return { referralCode: '', preferredLeg: '' };
  }

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(text, base);
    const referralCode = String(parsed.searchParams.get('ref') || parsed.searchParams.get('sponsor') || '').trim();
    if (referralCode) {
      return {
        referralCode,
        preferredLeg: normalizePlacementSide(parsed.searchParams.get('side'))
      };
    }
  } catch (_error) {
    // Fall back to plain-text parsing below.
  }

  if (text.includes('ref=') || text.includes('sponsor=')) {
    const queryString = text.includes('?') ? text.slice(text.indexOf('?') + 1) : text;
    const parsed = new URLSearchParams(queryString);
    const referralCode = String(parsed.get('ref') || parsed.get('sponsor') || '').trim();
    if (referralCode) {
      return {
        referralCode,
        preferredLeg: normalizePlacementSide(parsed.get('side'))
      };
    }
  }

  return {
    referralCode: text,
    preferredLeg: ''
  };
}
