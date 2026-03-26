const { withTransaction } = require('../../db/pool');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { ApiError } = require('../../utils/ApiError');
const adminRepository = require('../../repositories/adminRepository');
const walletRepository = require('../../repositories/walletRepository');
const walletService = require('../walletService');

async function listTransactions(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await adminRepository.listWalletTransactions(null, filters, pagination);
  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function getSummary() {
  return adminRepository.getWalletSummary(null);
}

async function adjustWallet(adminUserId, payload) {
  return withTransaction(async (client) => {
    if (!payload.reason) {
      throw new ApiError(400, 'Adjustment reason is required');
    }
    await walletRepository.createWallet(client, payload.userId);
    const beforeWallet = await walletRepository.getWallet(client, payload.userId);

    const metadata = {
      note: payload.reason,
      adminUserId,
      kind: 'admin_adjustment'
    };

    let result;
    if (payload.type === 'credit') {
      result = await walletService.credit(client, payload.userId, payload.amount, 'manual_adjustment', null, metadata, adminUserId);
    } else {
      result = await walletService.debit(client, payload.userId, payload.amount, 'manual_adjustment', null, metadata, adminUserId);
    }

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'wallet.adjust',
      targetEntity: 'wallet',
      targetId: payload.userId,
      beforeData: beforeWallet,
      afterData: result,
      metadata: {
        amount: payload.amount,
        type: payload.type,
        reason: payload.reason
      }
    });

    return result;
  });
}

module.exports = {
  listTransactions,
  getSummary,
  adjustWallet
};
