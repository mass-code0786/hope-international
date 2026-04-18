const bcrypt = require('bcryptjs');
const { withTransaction } = require('../db/pool');
const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const { createAuthToken } = require('../utils/token');
const { ApiError } = require('../utils/ApiError');

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
    const directChildId = leg === 'left' ? sponsor.left_child_id : sponsor.right_child_id;
    if (!directChildId) {
      return {
        parentId: sponsor.id,
        placementSide: leg
      };
    }

    const slot = await userRepository.findFirstAvailablePlacementInSubtree(client, sponsorId, leg);
    if (slot) {
      return {
        parentId: slot.parent_id,
        placementSide: slot.placement_side
      };
    }
  }

  if (preferredLeg) {
    throw new ApiError(409, `No available ${preferredLeg} slot in sponsor subtree`);
  }

  throw new ApiError(409, 'No available slot in sponsor subtree');
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
  const identifier = normalizeLoginIdentifier(payload.username || payload.email);
  const user = await userRepository.findByLogin(null, identifier);
  if (!user) {
    throw new ApiError(401, 'Invalid username/email or password');
  }

  const ok = await bcrypt.compare(payload.password, user.password_hash);
  if (!ok) {
    throw new ApiError(401, 'Invalid username/email or password');
  }

  const token = createAuthToken(user, { rememberMe: Boolean(payload.rememberMe) });
  return { user, token };
}

module.exports = {
  register,
  login,
  previewReferral
};
