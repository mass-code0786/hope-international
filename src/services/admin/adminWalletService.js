const { withTransaction } = require('../../db/pool');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { ApiError } = require('../../utils/ApiError');
const adminRepository = require('../../repositories/adminRepository');
const walletRepository = require('../../repositories/walletRepository');
const walletService = require('../walletService');
const btctStakingRepository = require('../../repositories/btctStakingRepository');
const btctStakingService = require('../btctStakingService');
const userRepository = require('../../repositories/userRepository');

const DEPOSIT_TEAM_INCOME_RULES = [
  { levelNumber: 1, percentage: 0.02, incomeType: 'direct_deposit_income' },
  { levelNumber: 2, percentage: 0.012, incomeType: 'level_deposit_income' },
  { levelNumber: 3, percentage: 0.012, incomeType: 'level_deposit_income' },
  { levelNumber: 4, percentage: 0.012, incomeType: 'level_deposit_income' },
  { levelNumber: 5, percentage: 0.012, incomeType: 'level_deposit_income' },
  { levelNumber: 6, percentage: 0.012, incomeType: 'level_deposit_income' },
  { levelNumber: 7, percentage: 0.012, incomeType: 'level_deposit_income' }
];

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function distributeDepositTeamIncome(client, deposit, adminUserId, adminNote = null) {
  const uplines = await userRepository.getSponsorUpline(client, deposit.user_id, 7);
  const uplinesByLevel = new Map(uplines.map((item) => [Number(item.level_number), item]));
  const baseAmount = toMoney(deposit.amount);
  const distributions = [];

  for (const rule of DEPOSIT_TEAM_INCOME_RULES) {
    const recipient = uplinesByLevel.get(rule.levelNumber);
    if (!recipient) continue;

    const creditedAmount = toMoney(baseAmount * rule.percentage);
    if (creditedAmount <= 0) continue;

    const ledger = await walletRepository.createDepositTeamIncomeLedgerEntry(client, {
      recipientUserId: recipient.id,
      sourceUserId: deposit.user_id,
      sourceDepositId: deposit.id,
      levelNumber: rule.levelNumber,
      incomeType: rule.incomeType,
      sourceType: 'deposit',
      status: 'approved',
      percentageUsed: rule.percentage * 100,
      baseAmount,
      creditedAmount
    });

    if (!ledger) {
      continue;
    }

    const { transaction } = await walletService.creditWithTransaction(
      client,
      recipient.id,
      creditedAmount,
      rule.incomeType,
      deposit.id,
      {
        status: 'approved',
        sourceUserId: deposit.user_id,
        sourceUsername: deposit.username || null,
        sourceDepositId: deposit.id,
        depositRequestId: deposit.id,
        levelNumber: rule.levelNumber,
        percentageUsed: rule.percentage * 100,
        baseAmount,
        creditedAmount,
        adminNote: adminNote || null,
        note: `${rule.levelNumber === 1 ? 'Direct' : `Level ${rule.levelNumber}`} deposit income from ${deposit.username || 'team member'}`
      },
      adminUserId
    );

    await walletRepository.updateDepositTeamIncomeLedgerWalletTransaction(client, ledger.id, transaction.id);

    distributions.push({
      ledgerId: ledger.id,
      walletTransactionId: transaction.id,
      recipientUserId: recipient.id,
      recipientUsername: recipient.username,
      levelNumber: rule.levelNumber,
      incomeType: rule.incomeType,
      percentageUsed: rule.percentage * 100,
      baseAmount,
      creditedAmount
    });
  }

  return distributions;
}

function buildPagedResult(result, pagination) {
  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

function normalizeDepositRecord(item) {
  if (!item) return null;
  const details = item.details && typeof item.details === 'object' && !Array.isArray(item.details) ? item.details : {};
  const transactionReference = item.transaction_hash || details.transactionReference || details.txHash || null;
  const walletAddressSnapshot = item.wallet_address_snapshot || details.walletAddressSnapshot || details.walletAddress || null;
  const proofImageUrl = item.proof_image_url || details.proofImageUrl || null;

  return {
    ...item,
    method: 'crypto',
    asset: item.asset || details.asset || 'USDT',
    network: item.network || details.network || 'BEP20',
    transaction_reference: transactionReference,
    tx_hash: transactionReference,
    wallet_address_snapshot: walletAddressSnapshot,
    proof_image_url: proofImageUrl,
    note: item.instructions || details.note || null,
    details
  };
}

async function listTransactions(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await adminRepository.listWalletTransactions(null, filters, pagination);
  return buildPagedResult(result, pagination);
}

async function getSummary() {
  return adminRepository.getWalletSummary(null);
}

async function listDeposits(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await walletRepository.listDepositRequestsAdmin(null, filters, pagination);
  return buildPagedResult({ ...result, items: result.items.map(normalizeDepositRecord) }, pagination);
}

async function reviewDeposit(adminUserId, requestId, payload) {
  return withTransaction(async (client) => {
    const request = await walletRepository.getDepositRequestById(client, requestId, { forUpdate: true });
    if (!request) {
      throw new ApiError(404, 'Deposit request not found');
    }
    if (request.status !== 'pending') {
      throw new ApiError(400, 'Only pending deposit requests can be reviewed');
    }

    const details = {
      ...(request.details || {}),
      adminNote: payload.adminNote || null,
      reviewedBy: adminUserId,
      reviewedAt: new Date().toISOString()
    };

    const updated = await walletRepository.updateDepositRequestStatus(client, requestId, {
      status: payload.status,
      details,
      reviewedBy: adminUserId,
      expectedCurrentStatus: 'pending'
    });
    if (!updated) {
      throw new ApiError(400, 'Deposit request is no longer pending');
    }

    if (payload.status === 'approved') {
      await walletService.credit(
        client,
        request.user_id,
        Number(request.amount),
        'deposit_request',
        request.id,
        {
          status: 'approved',
          adminNote: payload.adminNote || null,
          depositRequestId: request.id,
          transactionHash: request.transaction_hash || request.details?.transactionReference || request.details?.txHash || null
        },
        adminUserId
      );

      const teamIncomeDistributions = await distributeDepositTeamIncome(client, request, adminUserId, payload.adminNote || null);
      updated.details = {
        ...(updated.details || {}),
        teamIncomeDistributionCount: teamIncomeDistributions.length
      };
    }

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'deposit.review',
      targetEntity: 'wallet_deposit_requests',
      targetId: request.id,
      beforeData: request,
      afterData: updated,
      metadata: {
        status: payload.status,
        adminNote: payload.adminNote || null
      }
    });

    return normalizeDepositRecord(updated);
  });
}

async function listWithdrawals(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await walletRepository.listWithdrawalRequestsAdmin(null, filters, pagination);
  return buildPagedResult(result, pagination);
}

async function reviewWithdrawal(adminUserId, requestId, payload) {
  return withTransaction(async (client) => {
    const request = await walletRepository.getWithdrawalRequestById(client, requestId);
    if (!request) {
      throw new ApiError(404, 'Withdrawal request not found');
    }
    if (request.status !== 'pending') {
      throw new ApiError(400, 'Only pending withdrawal requests can be reviewed');
    }

    const updated = await walletRepository.updateWithdrawalRequestStatus(client, requestId, {
      status: payload.status,
      adminNote: payload.adminNote || ''
    });

    if (payload.status === 'rejected') {
      await walletService.credit(
        client,
        request.user_id,
        Number(request.amount),
        'withdrawal_request',
        request.id,
        {
          status: 'reversed',
          adminNote: payload.adminNote || null,
          withdrawalRequestId: request.id
        },
        adminUserId
      );
    }

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'withdrawal.review',
      targetEntity: 'wallet_withdrawal_requests',
      targetId: request.id,
      beforeData: request,
      afterData: updated,
      metadata: {
        status: payload.status,
        adminNote: payload.adminNote || null
      }
    });

    return updated;
  });
}

async function listP2p(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await walletRepository.listP2pTransfersAdmin(null, filters, pagination);
  return buildPagedResult(result, pagination);
}

async function listBindings(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await walletRepository.listWalletBindingsAdmin(null, filters, pagination);
  return buildPagedResult(result, pagination);
}

async function upsertBinding(adminUserId, userId, payload) {
  return withTransaction(async (client) => {
    const before = await walletRepository.getWalletBinding(client, userId);
    const updated = await walletRepository.upsertWalletBinding(client, userId, payload);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'wallet.binding.upsert',
      targetEntity: 'user_wallet_bindings',
      targetId: userId,
      beforeData: before,
      afterData: updated,
      metadata: { userId }
    });

    return updated;
  });
}

async function removeBinding(adminUserId, userId) {
  return withTransaction(async (client) => {
    const before = await walletRepository.getWalletBinding(client, userId);
    if (!before) {
      throw new ApiError(404, 'Wallet binding not found');
    }

    const removed = await walletRepository.removeWalletBinding(client, userId);

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'wallet.binding.remove',
      targetEntity: 'user_wallet_bindings',
      targetId: userId,
      beforeData: before,
      afterData: removed,
      metadata: { userId }
    });

    return removed;
  });
}

async function listIncome(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await walletRepository.listIncomeTransactionsAdmin(null, filters, pagination);
  return buildPagedResult(result, pagination);
}

async function getUserFinancialOverview(userId) {
  const profile = await adminRepository.getUserProfile(null, userId);
  if (!profile) {
    throw new ApiError(404, 'User not found');
  }

  const [
    wallet,
    walletBinding,
    deposits,
    withdrawals,
    p2p,
    transactions,
    orders
  ] = await Promise.all([
    walletRepository.getWallet(null, userId),
    walletRepository.getWalletBinding(null, userId),
    walletRepository.listDepositRequests(null, userId, 200),
    walletRepository.listWithdrawalRequests(null, userId, 200),
    walletRepository.listP2pTransfers(null, userId, 200),
    walletRepository.listTransactions(null, userId, 300),
    adminRepository.getUserOrders(null, userId, 200)
  ]);

  const incomeHistory = transactions.filter(
    (item) => item.tx_type === 'credit' && ['direct_income', 'matching_income', 'reward_qualification', 'direct_deposit_income', 'level_deposit_income'].includes(item.source)
  );

  return {
    profile,
    wallet,
    walletBinding,
    deposits: deposits.map(normalizeDepositRecord),
    withdrawals,
    p2pTransfers: p2p,
    incomeHistory,
    orders,
    transactions
  };
}

async function listBtctStaking() {
  const [plans, payouts] = await Promise.all([
    btctStakingRepository.listStakingPlansAdmin(null, 200),
    btctStakingRepository.listStakingPayoutsAdmin(null, 200)
  ]);

  return {
    plans,
    payouts
  };
}

async function runBtctStakingPayouts(payload = {}) {
  return btctStakingService.runDuePayouts({
    asOf: payload.asOf,
    limit: payload.limit || 100
  });
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
  listDeposits,
  reviewDeposit,
  listWithdrawals,
  reviewWithdrawal,
  listP2p,
  listBindings,
  upsertBinding,
  removeBinding,
  listIncome,
  getUserFinancialOverview,
  listBtctStaking,
  runBtctStakingPayouts,
  adjustWallet
};
