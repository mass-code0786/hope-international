const bcrypt = require('bcryptjs');
const { withTransaction } = require('../db/pool');
const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const { createAuthToken } = require('../utils/token');
const { ApiError } = require('../utils/ApiError');
const env = require('../config/env');
const { nowMs } = require('../utils/perf');
const { pool } = require('../db/pool');

const REFERRAL_REQUIRED_MESSAGE = 'Referral link/code is required for registration';

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeLoginIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function parseReferralContext(raw) {
  const text = String(raw || '').trim();
  if (!text) {
    return {
      sponsorUsername: '',
      preferredLeg: null
    };
  }

  try {
    const url = new URL(text);
    const ref = url.searchParams.get('ref') || url.searchParams.get('sponsor') || '';
    if (ref) {
      return {
        sponsorUsername: normalizeUsername(ref),
        preferredLeg: normalizePlacementSide(url.searchParams.get('side'))
      };
    }
  } catch (_error) {
    // Not a full URL, continue to raw parsing.
  }

  if (text.includes('ref=') || text.includes('sponsor=')) {
    const queryString = text.includes('?') ? text.slice(text.indexOf('?') + 1) : text;
    const parsed = new URLSearchParams(queryString);
    const ref = parsed.get('ref') || parsed.get('sponsor') || '';
    if (ref) {
      return {
        sponsorUsername: normalizeUsername(ref),
        preferredLeg: normalizePlacementSide(parsed.get('side'))
      };
    }
  }

  return {
    sponsorUsername: normalizeUsername(text),
    preferredLeg: null
  };
}

function normalizePlacementSide(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'left' || normalized === 'right' ? normalized : null;
}

async function resolveSponsor(client, payload) {
  const sponsorUsername = parseReferralContext(payload.referralCode).sponsorUsername;
  if (!sponsorUsername) {
    throw new ApiError(400, REFERRAL_REQUIRED_MESSAGE);
  }

  const sponsor = await userRepository.findByUsername(client, sponsorUsername);
  if (!sponsor) {
    throw new ApiError(400, 'Invalid referral code');
  }

  return sponsor;
}

async function resolveSponsorId(client, payload) {
  const sponsor = await resolveSponsor(client, payload);
  return sponsor.id;
}

async function resolvePlacementBySponsor(client, sponsorId, preferredLeg, strictPlacement = false) {
  const sponsor = await userRepository.getBinaryNode(client, sponsorId);
  if (!sponsor) {
    throw new ApiError(404, 'Sponsor user not found');
  }

  const legs = preferredLeg ? [preferredLeg] : ['left', 'right'];

  if (strictPlacement && preferredLeg) {
    const occupiedChildId = preferredLeg === 'left' ? sponsor.left_child_id : sponsor.right_child_id;
    if (occupiedChildId) {
      throw new ApiError(409, `Sponsor ${preferredLeg} side is already occupied`);
    }

    return {
      parentId: sponsor.id,
      placementSide: preferredLeg
    };
  }

  for (const leg of legs) {
    const slot = await userRepository.findFirstAvailablePlacementInLegChain(client, sponsorId, leg);
    if (slot) {
      return {
        parentId: slot.parent_id,
        placementSide: slot.placement_side
      };
    }
  }

  if (preferredLeg) {
    throw new ApiError(409, `No available ${preferredLeg} slot in sponsor leg chain`);
  }

  throw new ApiError(409, 'No available slot in sponsor leg chain');
}

async function previewReferral(referralCode, side) {
  const referralContext = parseReferralContext(referralCode);
  const sponsorUsername = referralContext.sponsorUsername;
  const normalizedSide = normalizePlacementSide(side) || referralContext.preferredLeg;
  if (!sponsorUsername) {
    throw new ApiError(400, REFERRAL_REQUIRED_MESSAGE);
  }

  const sponsor = await userRepository.findByUsername(null, sponsorUsername);
  if (!sponsor) {
    throw new ApiError(400, 'Invalid referral code');
  }

  const sponsorProfile = await userRepository.findById(null, sponsor.id);
  const placementPreview = normalizedSide
    ? await resolvePlacementBySponsor(null, sponsor.id, normalizedSide, false)
    : null;

  return {
    sponsor: sponsorProfile,
    requestedSide: normalizedSide,
    sideAvailable: normalizedSide ? Boolean(placementPreview?.parentId && placementPreview?.placementSide) : null
  };
}

async function register(payload) {
  return withTransaction(async (client) => {
    const referralContext = parseReferralContext(payload.referralCode);
    const username = normalizeUsername(payload.username);
    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const countryCode = String(payload.countryCode || '').trim();
    const mobileNumber = String(payload.mobileNumber || '').trim();
    const preferredLeg = normalizePlacementSide(payload.preferredLeg) || referralContext.preferredLeg;
    const strictPlacement = false;

    const existingEmail = await userRepository.findByEmail(client, email);
    if (existingEmail) {
      throw new ApiError(409, 'Email already exists');
    }

    const existingUsername = await userRepository.findByUsername(client, username);
    if (existingUsername) {
      throw new ApiError(409, 'Username already exists');
    }

    const rank = await userRepository.getDefaultRank(client);
    if (!rank) {
      throw new ApiError(500, 'Ranks are not configured. Seed rank data first.');
    }

    const sponsorId = await resolveSponsorId(client, payload);
    const placement = await resolvePlacementBySponsor(client, sponsorId, preferredLeg, strictPlacement);

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await userRepository.createUser(client, {
      firstName,
      lastName,
      username,
      email,
      countryCode,
      mobileNumber,
      passwordHash,
      sponsorId,
      parentId: placement.parentId,
      placementSide: placement.placementSide,
      rankId: rank.id,
      welcomeSpinEligible: true
    });

    if (placement.parentId) {
      const attached = await userRepository.setChild(client, placement.parentId, placement.placementSide, user.id);
      if (!attached) {
        throw new ApiError(409, strictPlacement ? `Sponsor ${placement.placementSide} side is already occupied` : 'Placement slot was occupied during registration. Retry.');
      }
    }

    await walletRepository.createWallet(client, user.id);

    const registeredUser = await userRepository.findById(client, user.id);
    const token = createAuthToken(registeredUser || user);
    return { user: registeredUser || user, token };
  });
}

async function login(payload) {
  const startedAt = nowMs();
  let timeoutId;

  const loginWork = (async () => {
    const identifier = normalizeLoginIdentifier(payload.username || payload.email);
    const lookupStartedAt = nowMs();
    const user = await userRepository.findByLogin(null, identifier);
    console.info('[auth.login.stage]', {
      stage: 'user_lookup',
      durationMs: Number((nowMs() - lookupStartedAt).toFixed(1)),
      found: Boolean(user)
    });
    if (!user) {
      throw new ApiError(401, 'Invalid username/email or password');
    }

    const passwordStartedAt = nowMs();
    const ok = await bcrypt.compare(payload.password, user.password_hash);
    console.info('[auth.login.stage]', {
      stage: 'password_compare',
      durationMs: Number((nowMs() - passwordStartedAt).toFixed(1)),
      matched: ok
    });
    if (!ok) {
      throw new ApiError(401, 'Invalid username/email or password');
    }

    const token = createAuthToken(user, { rememberMe: Boolean(payload.rememberMe) });
    return { user, token };
  })();

  const deadline = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      console.error('[auth.login.timeout]', {
        timeoutMs: env.loginRequestTimeoutMs,
        pool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      });
      const error = new ApiError(504, 'Login service timed out. Please try again.');
      error.code = 'LOGIN_TIMEOUT';
      reject(error);
    }, env.loginRequestTimeoutMs);
  });

  try {
    return await Promise.race([loginWork, deadline]);
  } finally {
    clearTimeout(timeoutId);
    const durationMs = Number((nowMs() - startedAt).toFixed(1));
    if (durationMs >= 250) {
      console.warn('[auth.login.duration]', { durationMs });
    }
  }
}

module.exports = {
  register,
  login,
  previewReferral
};
