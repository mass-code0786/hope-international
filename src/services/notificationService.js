const { withTransaction } = require('../db/pool');
const { normalizePagination, buildPagination } = require('../utils/pagination');
const { ApiError } = require('../utils/ApiError');
const notificationRepository = require('../repositories/notificationRepository');
const walletRepository = require('../repositories/walletRepository');
const orderRepository = require('../repositories/orderRepository');
const supportRepository = require('../repositories/supportRepository');
const auctionRepository = require('../repositories/auctionRepository');

const INCOME_NOTIFICATION_SOURCES = new Set([
  'direct_income',
  'matching_income',
  'reward_qualification',
  'direct_deposit_income',
  'level_deposit_income',
  'manual_adjustment',
  'btct_staking_payout'
]);

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function formatMoney(value) {
  return `$${toMoney(value).toFixed(2)}`;
}

function titleCase(value = '') {
  return String(value || '')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildDepositStatusNotification(request) {
  if (!request || !['approved', 'rejected', 'completed', 'failed'].includes(request.status)) return null;
  const status = request.status === 'completed' ? 'approved' : request.status;
  const actionLabel = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'updated';
  const adminNote = request.details?.adminNote || null;

  return {
    userId: request.user_id,
    type: 'deposit',
    title: `Deposit ${actionLabel}`,
    message: adminNote
      ? `Your deposit request for ${formatMoney(request.amount)} was ${actionLabel}. Note: ${adminNote}`
      : `Your deposit request for ${formatMoney(request.amount)} was ${actionLabel}.`,
    route: '/history/deposit',
    createdAt: request.updated_at || request.created_at,
    metadata: {
      sourceKey: `deposit:${request.id}:${request.status}`,
      depositRequestId: request.id,
      status: request.status,
      amount: toMoney(request.amount)
    }
  };
}

function buildWithdrawalStatusNotification(request) {
  if (!request || !['approved', 'rejected', 'completed', 'failed'].includes(request.status)) return null;
  const status = request.status === 'completed' ? 'approved' : request.status;
  const actionLabel = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'updated';

  return {
    userId: request.user_id,
    type: 'withdrawal',
    title: `Withdrawal ${actionLabel}`,
    message: `Your withdrawal request for ${formatMoney(request.amount)} was ${actionLabel}.`,
    route: '/history/withdraw',
    createdAt: request.updated_at || request.created_at,
    metadata: {
      sourceKey: `withdrawal:${request.id}:${request.status}`,
      withdrawalRequestId: request.id,
      status: request.status,
      amount: toMoney(request.amount)
    }
  };
}

function buildWalletTransactionNotification(transaction) {
  if (!transaction || !INCOME_NOTIFICATION_SOURCES.has(transaction.source)) return null;
  const amount = toMoney(transaction.amount);
  const sourceLabel = titleCase(transaction.source);
  const isStaking = transaction.source === 'btct_staking_payout';
  const title = isStaking ? 'Staking income credited' : 'Income credited';
  const route = isStaking ? '/wallet' : '/income';

  return {
    userId: transaction.user_id,
    type: 'income',
    title,
    message: `${sourceLabel} of ${formatMoney(amount)} has been credited to your account.`,
    route,
    createdAt: transaction.created_at,
    metadata: {
      sourceKey: `wallet-transaction:${transaction.id}`,
      walletTransactionId: transaction.id,
      source: transaction.source,
      amount
    }
  };
}

function buildBtctTransactionNotification(transaction) {
  if (!transaction || transaction.source !== 'auction_loss_compensation') return null;
  const amount = Number(Number(transaction.amount || 0).toFixed(4));
  const auctionTitle = transaction.metadata?.auctionTitle || 'Auction';

  return {
    userId: transaction.user_id,
    type: 'auction',
    title: 'Auction result available',
    message: `${auctionTitle} has been settled. ${amount.toFixed(4)} BTCT was credited as your auction reward.`,
    route: '/history/auctions',
    createdAt: transaction.created_at,
    metadata: {
      sourceKey: `btct-transaction:${transaction.id}`,
      btctTransactionId: transaction.id,
      source: transaction.source,
      auctionId: transaction.reference_id || transaction.metadata?.auctionId || null,
      amount
    }
  };
}

function buildOrderStatusNotification(order) {
  if (!order) return null;
  const status = String(order.status || 'paid');
  const statusLabel = titleCase(status);

  return {
    userId: order.user_id,
    type: 'order',
    title: `Order ${statusLabel}`,
    message: `Your order for ${formatMoney(order.total_amount)} is marked as ${statusLabel.toLowerCase()}.`,
    route: '/history/orders',
    createdAt: order.created_at,
    metadata: {
      sourceKey: `order:${order.id}:${status}`,
      orderId: order.id,
      status,
      totalAmount: toMoney(order.total_amount)
    }
  };
}

function buildSupportReplyNotification(reply) {
  if (!reply) return null;
  const preview = String(reply.message || '').trim().slice(0, 160);

  return {
    userId: reply.user_id,
    type: 'support',
    title: 'Support replied',
    message: preview
      ? `You have a new reply on "${reply.subject || 'Support request'}": ${preview}`
      : `You have a new reply on "${reply.subject || 'Support request'}".`,
    route: '/support',
    createdAt: reply.created_at,
    metadata: {
      sourceKey: `support-reply:${reply.id}`,
      supportMessageId: reply.id,
      threadId: reply.thread_id
    }
  };
}

function buildAuctionResultNotification(event) {
  if (!event) return null;
  const isWinner = event.result_type === 'winner';
  const title = isWinner ? 'Auction won' : 'Auction result available';
  const message = isWinner
    ? `You won ${event.auction_title || 'an auction'}.`
    : `${event.auction_title || 'An auction'} has been settled and your reward details are ready.`;

  return {
    userId: event.user_id,
    type: 'auction',
    title,
    message,
    route: '/history/auctions',
    createdAt: event.distributed_at || event.created_at,
    metadata: {
      sourceKey: `auction-result:${event.auction_id}:${event.user_id}:${event.result_type}`,
      auctionId: event.auction_id,
      resultType: event.result_type,
      btctAwarded: Number(Number(event.btct_awarded || 0).toFixed(4))
    }
  };
}

async function createNotification(client, payload) {
  return notificationRepository.createNotification(client, payload);
}

async function createNotificationOnce(client, payload) {
  return notificationRepository.createNotificationOnce(client, payload);
}

async function syncUserNotificationsWithClient(client, userId) {
  const [deposits, withdrawals, transactions, orders, supportReplies, auctionEvents] = await Promise.all([
    walletRepository.listDepositRequests(client, userId, 100),
    walletRepository.listWithdrawalRequests(client, userId, 100),
    walletRepository.listTransactions(client, userId, 200),
    orderRepository.listOrdersByUser(client, userId),
    supportRepository.listUserAdminReplies(client, userId, 100),
    auctionRepository.listUserAuctionNotificationEvents(client, userId, 100)
  ]);

  const payloads = [
    ...deposits.map(buildDepositStatusNotification),
    ...withdrawals.map(buildWithdrawalStatusNotification),
    ...transactions.map(buildWalletTransactionNotification),
    ...orders.map(buildOrderStatusNotification),
    ...supportReplies.map(buildSupportReplyNotification),
    ...auctionEvents.map(buildAuctionResultNotification)
  ].filter(Boolean);

  for (const payload of payloads) {
    await createNotificationOnce(client, payload);
  }
}

async function listUserNotifications(userId, query = {}) {
  return withTransaction(async (client) => {
    await syncUserNotificationsWithClient(client, userId);
    const pagination = normalizePagination({ ...query, limit: query.limit || 20, maxLimit: 100 });
    const result = await notificationRepository.listUserNotifications(client, userId, pagination);

    return {
      data: result.items,
      summary: result.summary,
      pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
    };
  });
}

async function getUnreadCount(userId) {
  return withTransaction(async (client) => {
    await syncUserNotificationsWithClient(client, userId);
    const unreadCount = await notificationRepository.getUnreadCount(client, userId);
    return { unreadCount };
  });
}

async function markNotificationAsRead(userId, notificationId) {
  return withTransaction(async (client) => {
    const notification = await notificationRepository.markAsRead(client, userId, notificationId);
    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }
    return notification;
  });
}

async function markAllNotificationsAsRead(userId) {
  return withTransaction(async (client) => {
    const updatedCount = await notificationRepository.markAllAsRead(client, userId);
    return { updatedCount };
  });
}

module.exports = {
  buildDepositStatusNotification,
  buildWithdrawalStatusNotification,
  buildWalletTransactionNotification,
  buildBtctTransactionNotification,
  buildOrderStatusNotification,
  buildSupportReplyNotification,
  buildAuctionResultNotification,
  createNotification,
  createNotificationOnce,
  syncUserNotificationsWithClient,
  listUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
