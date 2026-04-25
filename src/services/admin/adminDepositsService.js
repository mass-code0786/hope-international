const { withTransaction } = require('../../db/pool');
const { normalizePagination, buildPagination } = require('../../utils/pagination');
const { ApiError } = require('../../utils/ApiError');
const walletRepository = require('../../repositories/walletRepository');
const paymentRepository = require('../../repositories/paymentRepository');
const userRepository = require('../../repositories/userRepository');
const adminRepository = require('../../repositories/adminRepository');
const walletService = require('../walletService');
const notificationService = require('../notificationService');
const {
  DEPOSIT_STATUS,
  toDepositStatus,
  toDepositStatusKey,
  getDepositStatusLabel,
  getDepositStatusMessage,
  getDepositUserFacingStatus,
  depositRequiresAdminReview,
  isPendingDepositStatus
} = require('../../utils/depositStatus');

const ADMIN_TRANSFER_DUPLICATE_WINDOW_SECONDS = 30;
const ADMIN_TRANSFER_BURST_WINDOW_SECONDS = 300;
const ADMIN_TRANSFER_BURST_LIMIT = 12;

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizeDepositRecord(item) {
  if (!item) return null;
  const details = item.details && typeof item.details === 'object' && !Array.isArray(item.details) ? item.details : {};
  const paymentStatus = item.payment_status || details.paymentStatus || null;
  const status = toDepositStatus(item.status, DEPOSIT_STATUS.PENDING);
  const normalizedRecord = {
    ...item,
    payment_status: paymentStatus,
    status
  };

  return {
    ...normalizedRecord,
    payment_record_id: details.paymentRecordId || null,
    payment_provider: item.payment_provider || details.provider || null,
    status_key: toDepositStatusKey(status),
    status_label: getDepositStatusLabel(status),
    status_message: getDepositStatusMessage(normalizedRecord),
    user_facing_status: getDepositUserFacingStatus(normalizedRecord),
    requires_super_admin_approval: depositRequiresAdminReview(normalizedRecord)
  };
}

function buildPagedResult(result, pagination) {
  return {
    data: result.items,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function listDeposits(filters = {}, paginationInput = {}) {
  const pagination = normalizePagination(paginationInput);
  const result = await walletRepository.listDepositRequestsAdmin(null, {
    search: filters.search,
    status: filters.status ? toDepositStatus(filters.status) : DEPOSIT_STATUS.PENDING,
    reviewQueueOnly: true
  }, {
    limit: pagination.limit,
    offset: (pagination.page - 1) * pagination.limit
  });

  return buildPagedResult({
    items: result.items.map(normalizeDepositRecord),
    total: result.total
  }, pagination);
}

async function approveDeposit(adminUserId, requestId) {
  return withTransaction(async (client) => {
    const request = await walletRepository.getDepositRequestById(client, requestId, { forUpdate: true });
    if (!request) {
      throw new ApiError(404, 'Deposit request not found');
    }
    if (!isPendingDepositStatus(request.status)) {
      throw new ApiError(400, 'Only pending deposits can be approved');
    }
    if (!depositRequiresAdminReview(request)) {
      throw new ApiError(400, 'Deposit is still waiting for automatic confirmation');
    }

    const before = request;
    const paymentRecord = await paymentRepository.getNowPaymentsPaymentByDepositId(client, request.id, { forUpdate: true });
    const approvedAt = new Date().toISOString();

    await walletService.settleDepositRequest(client, request, {
      status: DEPOSIT_STATUS.SUCCESS,
      createdByAdminId: adminUserId,
      approvedBy: adminUserId,
      approvedAt,
      extraDetails: {
        manuallyApproved: true,
        approvedByRole: 'super_admin',
        approvedAt,
        paymentRecordId: paymentRecord?.id || request.details?.paymentRecordId || null
      }
    });

    if (paymentRecord) {
      await paymentRepository.updateNowPaymentsPayment(client, paymentRecord.id, {
        isCredited: true,
        walletCreditApplied: true,
        creditedAt: approvedAt
      });
    }

    const updated = await walletRepository.getDepositRequestById(client, request.id);
    await notificationService.createNotificationOnce(client, notificationService.buildDepositStatusNotification(updated));

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'deposit.approve',
      targetEntity: 'wallet_deposit_requests',
      targetId: request.id,
      beforeData: before,
      afterData: updated,
      metadata: {
        approvedAt,
        paymentRecordId: paymentRecord?.id || null
      }
    });

    return normalizeDepositRecord(updated);
  });
}

async function rejectDeposit(adminUserId, requestId, payload = {}) {
  return withTransaction(async (client) => {
    const request = await walletRepository.getDepositRequestById(client, requestId, { forUpdate: true });
    if (!request) {
      throw new ApiError(404, 'Deposit request not found');
    }
    if (!isPendingDepositStatus(request.status)) {
      throw new ApiError(400, 'Only pending deposits can be rejected');
    }
    if (!depositRequiresAdminReview(request)) {
      throw new ApiError(400, 'Deposit is still waiting for automatic confirmation');
    }

    const before = request;
    const rejectedAt = new Date().toISOString();
    const updated = await walletRepository.updateDepositRequestStatus(client, request.id, {
      status: DEPOSIT_STATUS.REJECTED,
      reviewedBy: adminUserId,
      approvedBy: null,
      approvedAt: null,
      isProcessed: true,
      details: {
        adminNote: payload.adminNote || null,
        manuallyRejected: true,
        rejectedAt,
        rejectedByRole: 'super_admin'
      },
      expectedCurrentStatus: request.status
    });

    await notificationService.createNotificationOnce(client, notificationService.buildDepositStatusNotification(updated));

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'deposit.reject',
      targetEntity: 'wallet_deposit_requests',
      targetId: request.id,
      beforeData: before,
      afterData: updated,
      metadata: {
        adminNote: payload.adminNote || null,
        rejectedAt
      }
    });

    return normalizeDepositRecord(updated);
  });
}

async function resolveTargetUser(client, payload = {}) {
  if (payload.userId) {
    return userRepository.findById(client, payload.userId);
  }

  return userRepository.findByUsername(client, payload.username);
}

async function sendFunds(adminUserId, payload = {}) {
  return withTransaction(async (client) => {
    const amount = toMoney(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(400, 'Amount must be greater than zero');
    }

    const note = String(payload.note || '').trim();
    const targetUser = await resolveTargetUser(client, payload);
    if (!targetUser) {
      throw new ApiError(404, 'User not found');
    }

    const recentActionCount = await walletRepository.countRecentAdminWalletActions(client, adminUserId, ADMIN_TRANSFER_BURST_WINDOW_SECONDS);
    if (recentActionCount >= ADMIN_TRANSFER_BURST_LIMIT) {
      throw new ApiError(429, 'Too many attempts. Please try again later.');
    }

    const duplicateAction = await walletRepository.findRecentAdminWalletActionDuplicate(client, {
      adminUserId,
      targetUserId: targetUser.id,
      walletType: 'deposit_wallet',
      actionType: 'super_admin_transfer',
      amount,
      reason: note,
      withinSeconds: ADMIN_TRANSFER_DUPLICATE_WINDOW_SECONDS
    });
    if (duplicateAction) {
      throw new ApiError(409, 'This action was already processed.');
    }

    const beforeWallet = await walletRepository.getWallet(client, targetUser.id);
    const transfer = await walletRepository.createAdminTransfer(client, {
      adminId: adminUserId,
      userId: targetUser.id,
      amount,
      note
    });

    const { wallet, transaction } = await walletService.creditWithTransaction(
      client,
      targetUser.id,
      amount,
      'admin_credit',
      transfer.id,
      {
        note,
        walletType: 'deposit_wallet',
        transactionType: 'ADMIN_CREDIT',
        sourceRole: 'super_admin',
        adminTransferId: transfer.id
      },
      adminUserId
    );

    await walletRepository.createAdminWalletAction(client, {
      adminUserId,
      targetUserId: targetUser.id,
      walletType: 'deposit_wallet',
      actionType: 'super_admin_transfer',
      amount,
      reason: note,
      metadata: {
        adminTransferId: transfer.id
      }
    });

    await notificationService.createNotificationOnce(
      client,
      notificationService.buildAdminTransferNotification(transfer, targetUser)
    );

    await adminRepository.logAdminAction(client, {
      adminUserId,
      actionType: 'wallet.super_admin_transfer',
      targetEntity: 'admin_transfers',
      targetId: transfer.id,
      beforeData: beforeWallet,
      afterData: wallet,
      metadata: {
        userId: targetUser.id,
        username: targetUser.username,
        amount,
        note,
        walletTransactionId: transaction.id
      }
    });

    return {
      transfer,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email
      },
      wallet,
      transaction
    };
  });
}

module.exports = {
  listDeposits,
  approveDeposit,
  rejectDeposit,
  sendFunds
};
