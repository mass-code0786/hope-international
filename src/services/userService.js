const userRepository = require('../repositories/userRepository');
const adminRepository = require('../repositories/adminRepository');
const { ApiError } = require('../utils/ApiError');

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
  return adminRepository.getTeamSummary(null, userId);
}

async function getTeamTreeRoot(userId) {
  return buildTeamTreeNode(userId, userId);
}

async function getTeamTreeNode(userId, nodeId) {
  return buildTeamTreeNode(userId, nodeId);
}

module.exports = {
  getProfile,
  getChildren,
  getTeamSummary,
  getTeamTreeRoot,
  getTeamTreeNode
};
