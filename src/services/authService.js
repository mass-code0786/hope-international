const bcrypt = require('bcryptjs');
const { withTransaction } = require('../db/pool');
const env = require('../config/env');
const userRepository = require('../repositories/userRepository');
const walletRepository = require('../repositories/walletRepository');
const { createAuthToken, createAuthTokenWithOptions } = require('../utils/token');
const { ApiError } = require('../utils/ApiError');

async function register(payload) {
  return withTransaction(async (client) => {
    const existingEmail = await userRepository.findByEmail(client, payload.email);
    if (existingEmail) {
      throw new ApiError(409, 'Email already exists');
    }

    const existingUsername = await userRepository.findByUsername(client, payload.username);
    if (existingUsername) {
      throw new ApiError(409, 'Username already exists');
    }

    const rank = await userRepository.getDefaultRank(client);
    if (!rank) {
      throw new ApiError(500, 'Ranks are not configured. Seed rank data first.');
    }

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
    } else if (payload.sponsorId && payload.preferredLeg) {
      const sponsor = await userRepository.getBinaryNode(client, payload.sponsorId);
      if (!sponsor) {
        throw new ApiError(404, 'Sponsor user not found');
      }

      const slot = await userRepository.findFirstAvailableParentByLeg(client, payload.sponsorId, payload.preferredLeg);
      if (!slot) {
        throw new ApiError(409, `No available ${payload.preferredLeg} slot in sponsor subtree`);
      }

      placement = {
        parentId: slot.parent_id,
        placementSide: payload.preferredLeg
      };
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await userRepository.createUser(client, {
      username: payload.username,
      email: payload.email,
      passwordHash,
      sponsorId: payload.sponsorId || null,
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
  const user = await userRepository.findByEmail(null, payload.email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const ok = await bcrypt.compare(payload.password, user.password_hash);
  if (!ok) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = createAuthToken(user);
  return { user, token };
}

async function demoLogin(payload) {
  if (!env.demoModeEnabled) {
    throw new ApiError(403, 'Demo mode is disabled');
  }

  const accountByRole = {
    user: { email: env.demoUserEmail, allowedRoles: ['user', 'seller', 'admin', 'super_admin'] },
    seller: { email: env.demoSellerEmail, allowedRoles: ['seller', 'admin', 'super_admin'] },
    admin: { email: env.demoAdminEmail, allowedRoles: ['admin', 'super_admin'] }
  };

  const config = accountByRole[payload.role];
  if (!config) {
    throw new ApiError(400, 'Invalid demo role');
  }

  const user = await userRepository.findByEmail(null, config.email);
  if (!user) {
    throw new ApiError(500, `Configured demo account not found for role "${payload.role}"`);
  }

  if (!config.allowedRoles.includes(user.role)) {
    throw new ApiError(500, `Configured demo account for role "${payload.role}" has invalid permissions`);
  }

  const token = createAuthTokenWithOptions(user, { isDemo: true });
  return { user: { ...user, is_demo: true }, token };
}

module.exports = {
  register,
  login,
  demoLogin
};
