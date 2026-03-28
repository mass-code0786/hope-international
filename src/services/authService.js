const bcrypt = require('bcryptjs');
const { withTransaction } = require('../db/pool');
const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const { createAuthToken } = require('../utils/token');
const { ApiError } = require('../utils/ApiError');

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeLoginIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeReferralCode(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';

  try {
    const url = new URL(text);
    const ref = url.searchParams.get('ref') || url.searchParams.get('sponsor') || '';
    if (ref) return normalizeUsername(ref);
  } catch (_error) {
    // Not a full URL, continue to raw parsing.
  }

  if (text.includes('ref=')) {
    const fromQuery = text.split('ref=')[1]?.split('&')[0] || '';
    if (fromQuery) return normalizeUsername(fromQuery);
  }

  return normalizeUsername(text);
}

async function resolveSponsorId(client, payload) {
  if (payload.sponsorId) {
    return payload.sponsorId;
  }

  const referralValue = payload.referralUsername || payload.referralCode || payload.sponsorCode;
  const sponsorUsername = normalizeReferralCode(referralValue);
  if (!sponsorUsername) {
    return null;
  }

  const sponsor = await userRepository.findByUsername(client, sponsorUsername);
  if (!sponsor) {
    throw new ApiError(404, 'Referral username not found');
  }

  return sponsor.id;
}

async function resolvePlacementBySponsor(client, sponsorId, preferredLeg) {
  const sponsor = await userRepository.getBinaryNode(client, sponsorId);
  if (!sponsor) {
    throw new ApiError(404, 'Sponsor user not found');
  }

  const legs = preferredLeg ? [preferredLeg] : ['left', 'right'];

  for (const leg of legs) {
    const slot = await userRepository.findFirstAvailableParentByLeg(client, sponsorId, leg);
    if (slot) {
      return {
        parentId: slot.parent_id,
        placementSide: leg
      };
    }
  }

  if (preferredLeg) {
    throw new ApiError(409, `No available ${preferredLeg} slot in sponsor subtree`);
  }

  throw new ApiError(409, 'No available slot in sponsor subtree');
}

async function register(payload) {
  return withTransaction(async (client) => {
    const username = normalizeUsername(payload.username);
    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const countryCode = String(payload.countryCode || '').trim();
    const mobileNumber = String(payload.mobileNumber || '').trim();

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
    let placement = { parentId: null, placementSide: null };

    if (payload.parentId) {
      const parent = await userRepository.getBinaryNode(client, payload.parentId);
      if (!parent) {
        throw new ApiError(404, 'Parent user not found');
      }

      const column = payload.placementSide === 'left' ? parent.left_child_id : parent.right_child_id;
      if (column) {
        throw new ApiError(409, `Parent ${payload.placementSide} leg is already occupied`);
      }

      placement = {
        parentId: payload.parentId,
        placementSide: payload.placementSide
      };
    } else if (sponsorId) {
      placement = await resolvePlacementBySponsor(client, sponsorId, payload.preferredLeg);
    }

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
      rankId: rank.id
    });

    if (placement.parentId) {
      const attached = await userRepository.setChild(client, placement.parentId, placement.placementSide, user.id);
      if (!attached) {
        throw new ApiError(409, 'Placement slot was occupied during registration. Retry.');
      }
    }

    await walletRepository.createWallet(client, user.id);

    const token = createAuthToken(user);
    return { user, token };
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

  const token = createAuthToken(user);
  return { user, token };
}

module.exports = {
  register,
  login
};
