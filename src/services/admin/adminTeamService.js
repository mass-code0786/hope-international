const { ApiError } = require('../../utils/ApiError');
const adminRepository = require('../../repositories/adminRepository');

function buildTree(rows, rootId) {
  const byId = new Map();
  for (const row of rows) {
    byId.set(row.id, {
      id: row.id,
      username: row.username,
      email: row.email,
      placementSide: row.placement_side,
      isActive: row.is_active,
      children: []
    });
  }

  let root = null;
  for (const row of rows) {
    const node = byId.get(row.id);
    if (row.id === rootId) {
      root = node;
    }
    if (row.parent_id && byId.has(row.parent_id)) {
      byId.get(row.parent_id).children.push(node);
    }
  }

  return root;
}

async function getTree(userId, depth) {
  const rows = await adminRepository.getTeamTree(null, userId, depth);
  if (!rows.length) {
    throw new ApiError(404, 'User or team tree not found');
  }

  return {
    root: buildTree(rows, userId),
    depth,
    nodeCount: rows.length
  };
}

async function getSummary(userId) {
  const [profile, summary] = await Promise.all([
    adminRepository.getUserProfile(null, userId),
    adminRepository.getTeamSummary(null, userId)
  ]);

  if (!profile) {
    throw new ApiError(404, 'User not found');
  }

  return {
    user: profile,
    summary
  };
}

module.exports = {
  getTree,
  getSummary
};
