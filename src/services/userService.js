const userRepository = require('../repositories/userRepository');
const userAddressRepository = require('../repositories/userAddressRepository');
const adminRepository = require('../repositories/adminRepository');
const webauthnService = require('./webauthnService');
const walletService = require('./walletService');
const { ApiError } = require('../utils/ApiError');
const { withTransaction } = require('../db/pool');

function formatTeamNode(row) {
  if (!row) return null;

  const displayName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.username || 'Member';

  return {
    id: row.id,
    memberId: row.id,
    username: row.username,
    displayName,
    email: row.email,
    parentId: row.parent_id,
    placementSide: row.placement_side || null,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    directCount: Number(row.direct_count || 0),
    hasChildren: Boolean(row.left_child_id || row.right_child_id)
  };
}

async function buildTeamTreeNode(viewerId, targetId) {
  const targetNode = await userRepository.getTeamTreeNode(null, targetId);
  if (!targetNode) {
    throw new ApiError(404, 'Team node not found');
  }

  if (viewerId !== targetId) {
    const allowed = await userRepository.isNodeInSubtree(null, viewerId, targetId);
    if (!allowed) {
      throw new ApiError(403, 'You do not have access to that team node');
    }
  }

  const childIds = [targetNode.left_child_id, targetNode.right_child_id].filter(Boolean);
  const childRows = await userRepository.getTeamTreeNodesByIds(null, childIds);
  const byId = new Map(childRows.map((row) => [row.id, row]));

  return {
    ...formatTeamNode(targetNode),
    children: {
      left: targetNode.left_child_id ? formatTeamNode(byId.get(targetNode.left_child_id) || null) : null,
      right: targetNode.right_child_id ? formatTeamNode(byId.get(targetNode.right_child_id) || null) : null
    }
  };
}

async function getProfile(userId) {
  const user = await userRepository.findById(null, userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

async function getChildren(userId) {
  return userRepository.getDirectChildren(null, userId);
}

async function getTeamSummary(userId) {
  const [profile, summary] = await Promise.all([
    userRepository.findById(null, userId),
    adminRepository.getTeamSummary(null, userId)
  ]);

  if (!profile) {
    throw new ApiError(404, 'User not found');
  }

  const leftPv = Number(profile.carry_left_pv || 0);
  const rightPv = Number(profile.carry_right_pv || 0);
  const normalized = {
    total_descendants: Number(summary?.total_descendants || 0),
    active_count: Number(summary?.active_count || 0),
    inactive_count: Number(summary?.inactive_count || 0),
    direct_referral_count: Number(summary?.direct_referral_count || 0),
    direct_binary_count: Number(summary?.direct_binary_count || 0),
    left_team_count: Number(summary?.left_team_count || 0),
    right_team_count: Number(summary?.right_team_count || 0),
    left_pv: leftPv,
    right_pv: rightPv,
    placement_side: profile.placement_side || null,
    matched_potential: Math.min(leftPv, rightPv)
  };

  if (process.env.NODE_ENV !== 'production') {
    console.info('[team.backend] summary-computed', {
      userId,
      leftTeamCount: normalized.left_team_count,
      rightTeamCount: normalized.right_team_count,
      leftPv: normalized.left_pv,
      rightPv: normalized.right_pv,
      totalDescendants: normalized.total_descendants,
      directReferralCount: normalized.direct_referral_count,
      directBinaryCount: normalized.direct_binary_count
    });
  }

  return normalized;
}

async function getTeamTreeRoot(userId) {
  return buildTeamTreeNode(userId, userId);
}

async function getTeamTreeNode(userId, nodeId) {
  return buildTeamTreeNode(userId, nodeId);
}

function mapAddress(address) {
  if (!address) return null;

  return {
    id: address.id,
    userId: address.user_id,
    fullName: address.full_name,
    mobile: address.mobile,
    alternateMobile: address.alternate_mobile || '',
    country: address.country,
    state: address.state,
    city: address.city,
    area: address.area,
    addressLine: address.address_line,
    postalCode: address.postal_code,
    deliveryNote: address.delivery_note || '',
    isDefault: Boolean(address.is_default),
    createdAt: address.created_at,
    updatedAt: address.updated_at
  };
}

async function getAddress(userId) {
  const user = await getProfile(userId);
  const address = await userAddressRepository.getByUserId(null, userId);

  return {
    address: mapAddress(address),
    prefill: {
      fullName: [user.first_name, user.last_name].filter(Boolean).join(' ').trim(),
      mobile: user.mobile_number || '',
      country: user.country_code || ''
    }
  };
}

async function saveAddress(userId, payload) {
  return withTransaction(async (client) => {
    await getProfile(userId);
    const existing = await userAddressRepository.getByUserId(client, userId);
    const saved = existing
      ? await userAddressRepository.update(client, userId, payload)
      : await userAddressRepository.create(client, userId, payload);

    return mapAddress(saved);
  });
}

async function getWelcomeSpinStatus(userId) {
  return walletService.getWelcomeSpinStatus(null, userId);
}

async function claimWelcomeSpin(userId) {
  return withTransaction(async (client) => walletService.claimWelcomeSpin(client, userId));
}

async function getWebauthnStatus(userId) {
  await getProfile(userId);
  return webauthnService.getCredentialStatus(userId);
}

async function removeWebauthnCredential(userId, credentialId) {
  await getProfile(userId);
  return webauthnService.removeCredential(userId, credentialId);
}

module.exports = {
  getProfile,
  getChildren,
  getTeamSummary,
  getTeamTreeRoot,
  getTeamTreeNode,
  getAddress,
  saveAddress,
  getWelcomeSpinStatus,
  claimWelcomeSpin,
  getWebauthnStatus,
  removeWebauthnCredential
};
