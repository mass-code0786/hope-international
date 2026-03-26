const { withTransaction } = require('../../db/pool');
const { ApiError } = require('../../utils/ApiError');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const adminRepository = require('../../repositories/adminRepository');

async function listUsers(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await adminRepository.listUsers(null, filters, pagination);
  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function searchUsers(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await adminRepository.searchUsers(null, filters, pagination);
  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total }),
    summary: {
      query: filters.q
    }
  };
}

async function listRanks() {
  const ranks = await adminRepository.listRanks(null);
  return {
    data: ranks.map((rank) => ({
      id: rank.id,
      name: rank.name,
      cap_multiplier: rank.cap_multiplier,
      is_active: rank.is_active,
      display_order: rank.display_order ?? null
    })),
    summary: {
      total: ranks.length,
      active: ranks.filter((rank) => rank.is_active).length
    }
  };
}

async function getUserDetails(userId) {
  const profile = await adminRepository.getUserProfile(null, userId);
  if (!profile) {
    throw new ApiError(404, 'User not found');
  }

  const [wallet, weekly, monthly, orders, transactions, children] = await Promise.all([
    adminRepository.getUserWalletSummary(null, userId),
    adminRepository.getUserLatestWeeklySummary(null, userId),
    adminRepository.getUserLatestMonthlySummary(null, userId),
    adminRepository.getUserOrders(null, userId, 20),
    adminRepository.getUserTransactions(null, userId, 50),
    adminRepository.getUserChildren(null, userId)
  ]);

  return {
    profile,
    wallet,
    weeklyCompensation: weekly,
    monthlyCompensation: monthly,
    orders,
    transactions,
    teamSnapshot: {
      directChildren: children
    }
  };
}

async function updateUserStatus(adminUserId, userId, isActive) {
  return withTransaction(async (client) => {
    const before = await adminRepository.getUserProfile(client, userId);
    if (!before) {
      throw new ApiError(404, 'User not found');
    }

    const updated = await adminRepository.updateUserStatus(client, userId, isActive);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'user.status.update',
      targetEntity: 'user',
      targetId: userId,
      beforeData: before,
      afterData: updated,
      metadata: { isActive }
    });

    return updated;
  });
}

async function updateUserRank(adminUserId, userId, rankId) {
  return withTransaction(async (client) => {
    const before = await adminRepository.getUserProfile(client, userId);
    if (!before) {
      throw new ApiError(404, 'User not found');
    }

    const ranks = await adminRepository.listRanks(client);
    const rank = ranks.find((r) => r.id === rankId);
    if (!rank) {
      throw new ApiError(400, 'Invalid rank id');
    }

    const updated = await adminRepository.updateUserRank(client, userId, rankId);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'user.rank.update',
      targetEntity: 'user',
      targetId: userId,
      beforeData: before,
      afterData: updated,
      metadata: { rankId }
    });

    return updated;
  });
}

module.exports = {
  listUsers,
  searchUsers,
  listRanks,
  getUserDetails,
  updateUserStatus,
  updateUserRank
};
