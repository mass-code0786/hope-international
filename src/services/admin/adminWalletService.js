const { withTransaction } = require('../../db/pool');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { ApiError } = require('../../utils/ApiError');
const adminRepository = require('../../repositories/adminRepository');
const walletRepository = require('../../repositories/walletRepository');
const walletService = require('../walletService');
const btctStakingRepository = require('../../repositories/btctStakingRepository');
const btctStakingService = require('../btctStakingService');
const userRepository = require('../../repositories/userRepository');
const notificationService = require('../notificationService');

const DIRECT_DEPOSIT_INCOME_RULE = { levelNumber: 1, percentage: 0.02, incomeType: 'direct_deposit_income' };
const LEVEL_DEPOSIT_INCOME_RULES = [
  { levelNumber: 2, percentage: 0.012, incomeType: 'level_deposit_income' },
  { levelNumber: 3, percentage: 0.012, incomeType: 'level_deposit_income' },
  { levelNumber: 4, percentage: 0.012, incomeType: 'level_deposit_income' },
  { levelNumber: 5, percentage: 0.012, incomeType: 'level_deposit_income' },
  { levelNumber: 6, percentage: 0.012, incomeType: 'level_deposit_income' }
];
const ADMIN_WALLET_ACTION_DUPLICATE_WINDOW_SECONDS = 30;
const ADMIN_WALLET_ACTION_BURST_WINDOW_SECONDS = 300;
const ADMIN_WALLET_ACTION_BURST_LIMIT = 12;

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

const ADMIN_WALLET_TYPES = new Set(['deposit_wallet', 'income_wallet', 'bonus_wallet']);

function normalizeWalletType(walletType) {
  return String(walletType || '').trim().toLowerCase();
}

function sanitizeRequestMeta(meta = {}) {
  return {
    ipAddress: String(meta.ipAddress || '').trim() || null
  };
}

async function logSecurityEvent(client, payload = {}) {
  try {
    await walletRepository.createSecurityEvent(client, {
      userId: payload.userId || null,
      actionType: payload.actionType,
      reason: payload.reason,
      metadata: payload.metadata || {},
      ipAddress: payload.ipAddress || null
    });
  } catch (_error) {
    // Security logging must not break admin workflows.
  }
}

async function blockWithSecurityLog(client, payload, statusCode, message) {
  await logSecurityEvent(client, payload);
  throw new ApiError(statusCode, message);
}

async function distributeDepositTeamIncome(client, deposit, adminUserId, adminNote = null) {
  const maxDepositIncomeLevel = LEVEL_DEPOSIT_INCOME_RULES[LEVEL_DEPOSIT_INCOME_RULES.length - 1]?.levelNumber || DIRECT_DEPOSIT_INCOME_RULE.levelNumber;
  const uplines = await userRepository.getSponsorUpline(client, deposit.user_id, maxDepositIncomeLevel);
  const uplinesByLevel = new Map(uplines.map((item) => [Number(item.level_number), item]));
  const levelIncomeRecipientIds = LEVEL_DEPOSIT_INCOME_RULES
    .map((rule) => uplinesByLevel.get(rule.levelNumber)?.id)
    .filter(Boolean);
  const directReferralCounts = await userRepository.getDirectReferralCounts(client, levelIncomeRecipientIds);
  const baseAmount = toMoney(deposit.amount);
  const distributions = [];

  const depositIncomeRules = [DIRECT_DEPOSIT_INCOME_RULE, ...LEVEL_DEPOSIT_INCOME_RULES];

  for (const rule of depositIncomeRules) {
    const recipient = uplinesByLevel.get(rule.levelNumber);
    if (!recipient) continue;

    if (rule.incomeType === 'level_deposit_income') {
      const directReferralCount = Number(directReferralCounts.get(recipient.id) || 0);
      if (directReferralCount < rule.levelNumber) {
        continue;
      }
    }

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

async function listWalletUsers(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await walletRepository.listAdminWalletUsers(null, filters, pagination);
  return buildPagedResult(result, pagination);
}

async function getWalletUser(userId) {
  const user = await walletRepository.getAdminWalletUser(null, userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
}

async function listDeposits(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await walletRepository.listDepositRequestsAdmin(null, filters, pagination);
  return buildPagedResult({ ...result, items: result.items.map(normalizeDepositRecord) }, pagination);
}

async function reviewDeposit(adminUserId, requestId, payload) {
  return withTransaction(async (client) => {
    const requestMeta = sanitizeRequestMeta(payload.requestMeta);
    const request = await walletRepository.getDepositRequestById(client, requestId, { forUpdate: true });
    if (!request) {
      throw new ApiError(404, 'Deposit request not found');
    }
    if (request.status !== 'pending') {
      await blockWithSecurityLog(client, {
        userId: request.user_id,
        actionType: 'admin_deposit_review_blocked',
        reason: 'already_processed',
        ipAddress: requestMeta.ipAddress,
        metadata: { adminUserId, requestId, currentStatus: request.status }
      }, 400, 'This action was already processed.');
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
      await blockWithSecurityLog(client, {
        userId: request.user_id,
        actionType: 'admin_deposit_review_blocked',
        reason: 'already_processed',
        ipAddress: requestMeta.ipAddress,
        metadata: { adminUserId, requestId }
      }, 400, 'This action was already processed.');
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

    await notificationService.createNotificationOnce(client, notificationService.buildDepositStatusNotification(updated));

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

    await notificationService.createNotificationOnce(client, notificationService.buildWithdrawalStatusNotification(updated));

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
    const requestMeta = sanitizeRequestMeta(payload.requestMeta);
    if (!payload.reason) {
      throw new ApiError(400, 'Adjustment reason is required');
    }
    const walletType = normalizeWalletType(payload.walletType);
    if (!ADMIN_WALLET_TYPES.has(walletType)) {
      throw new ApiError(400, 'Valid wallet type is required');
    }
    const recentActionCount = await walletRepository.countRecentAdminWalletActions(client, adminUserId, ADMIN_WALLET_ACTION_BURST_WINDOW_SECONDS);
    if (recentActionCount >= ADMIN_WALLET_ACTION_BURST_LIMIT) {
      await blockWithSecurityLog(client, {
        userId: payload.userId,
        actionType: 'admin_wallet_adjust_blocked',
        reason: 'rate_limited',
        ipAddress: requestMeta.ipAddress,
        metadata: { adminUserId, recentActionCount, windowSeconds: ADMIN_WALLET_ACTION_BURST_WINDOW_SECONDS }
      }, 429, 'Too many attempts. Please try again later.');
    }

    const duplicateAction = await walletRepository.findRecentAdminWalletActionDuplicate(client, {
      adminUserId,
      targetUserId: payload.userId,
      walletType,
      actionType: payload.type === 'credit' ? 'adjust_add' : 'adjust_deduct',
      amount: toMoney(payload.amount),
      reason: payload.reason,
      withinSeconds: ADMIN_WALLET_ACTION_DUPLICATE_WINDOW_SECONDS
    });
    if (duplicateAction) {
      await logSecurityEvent(client, {
        userId: payload.userId,
        actionType: 'admin_wallet_adjust_duplicate',
        reason: 'already_processed',
        ipAddress: requestMeta.ipAddress,
        metadata: { adminUserId, actionId: duplicateAction.id, walletType, amount: toMoney(payload.amount) }
      });
      throw new ApiError(409, 'This action was already processed.');
    }

    await walletRepository.createWallet(client, payload.userId);
    const beforeWallet = await walletRepository.getWallet(client, payload.userId);

    const metadata = {
      note: payload.reason,
      adminUserId,
      kind: 'admin_adjustment',
      walletType
    };

    let result;
    if (payload.type === 'credit') {
      result = await walletService.credit(client, payload.userId, payload.amount, 'manual_adjustment', null, metadata, adminUserId);
    } else {
      const amountDelta = Number(payload.amount || 0) * -1;
      const adjusted = await walletRepository.adjustWalletBalance(client, payload.userId, walletType, amountDelta);
      if (!adjusted) {
        await blockWithSecurityLog(client, {
          userId: payload.userId,
          actionType: 'admin_wallet_adjust_blocked',
          reason: 'insufficient_balance',
          ipAddress: requestMeta.ipAddress,
          metadata: { adminUserId, walletType, amount: toMoney(payload.amount) }
        }, 400, 'Insufficient balance.');
      }
      await walletRepository.createTransaction(client, {
        userId: payload.userId,
        txType: 'debit',
        source: 'manual_adjustment',
        amount: payload.amount,
        referenceId: null,
        metadata: {
          ...metadata,
          walletBreakdown: {
            [walletType.replace('_wallet', '')]: toMoney(payload.amount)
          }
        },
        createdByAdminId: adminUserId
      });
      result = adjusted;
    }

    await walletRepository.createAdminWalletAction(client, {
      adminUserId,
      targetUserId: payload.userId,
      walletType,
      actionType: payload.type === 'credit' ? 'adjust_add' : 'adjust_deduct',
      amount: payload.amount,
      reason: payload.reason,
      metadata: {
        reason: payload.reason,
        adjustmentType: payload.type
      }
    });

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
        reason: payload.reason,
        walletType
      }
    });

    return result;
  });
}

async function setWalletFreeze(adminUserId, payload, freeze) {
  return withTransaction(async (client) => {
    const requestMeta = sanitizeRequestMeta(payload.requestMeta);
    const walletType = normalizeWalletType(payload.walletType);
    if (!ADMIN_WALLET_TYPES.has(walletType)) {
      throw new ApiError(400, 'Valid wallet type is required');
    }
    if (!payload.reason) {
      throw new ApiError(400, 'Reason is required');
    }

    await walletRepository.createWallet(client, payload.userId);
    const beforeWallet = await walletRepository.getWallet(client, payload.userId);
    const duplicateAction = await walletRepository.findRecentAdminWalletActionDuplicate(client, {
      adminUserId,
      targetUserId: payload.userId,
      walletType,
      actionType: freeze ? 'freeze' : 'unfreeze',
      amount: null,
      reason: payload.reason,
      withinSeconds: ADMIN_WALLET_ACTION_DUPLICATE_WINDOW_SECONDS
    });
    if (duplicateAction) {
      await logSecurityEvent(client, {
        userId: payload.userId,
        actionType: 'admin_wallet_freeze_duplicate',
        reason: 'already_processed',
        ipAddress: requestMeta.ipAddress,
        metadata: { adminUserId, actionId: duplicateAction.id, walletType, freeze }
      });
      throw new ApiError(409, 'This action was already processed.');
    }
    const updated = await walletRepository.setWalletFreezeStatus(client, payload.userId, walletType, freeze);
    if (!updated) {
      throw new ApiError(404, 'Wallet not found');
    }

    await walletRepository.createAdminWalletAction(client, {
      adminUserId,
      targetUserId: payload.userId,
      walletType,
      actionType: freeze ? 'freeze' : 'unfreeze',
      amount: null,
      reason: payload.reason,
      metadata: {
        frozen: freeze
      }
    });

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: freeze ? 'wallet.freeze' : 'wallet.unfreeze',
      targetEntity: 'wallet',
      targetId: payload.userId,
      beforeData: beforeWallet,
      afterData: updated,
      metadata: {
        walletType,
        reason: payload.reason,
        frozen: freeze
      }
    });

    return updated;
  });
}

async function listWalletLogs(filters, paginationInput) {
  const pagination = normalizePagination(paginationInput);
  const result = await walletRepository.listAdminWalletActions(null, filters, pagination);
  return buildPagedResult(result, pagination);
}

module.exports = {
  listTransactions,
  getSummary,
  listWalletUsers,
  getWalletUser,
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
  adjustWallet,
  setWalletFreeze,
  listWalletLogs
};
