const { withTransaction } = require('../db/pool');
const { normalizePagination, buildPagination } = require('../utils/pagination');
const { ApiError } = require('../utils/ApiError');
const supportRepository = require('../repositories/supportRepository');
const notificationService = require('./notificationService');

const SUPPORT_CATEGORIES = ['order_issue', 'payment_issue', 'auction_issue', 'account_issue', 'seller_issue', 'other'];
const SUPPORT_STATUSES = ['open', 'replied', 'closed'];

function normalizeSearch(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, 120) : undefined;
}

function normalizeThreadFilters(input = {}) {
  return {
    status: SUPPORT_STATUSES.includes(input.status) ? input.status : undefined,
    category: SUPPORT_CATEGORIES.includes(input.category) ? input.category : undefined,
    userId: input.userId || undefined,
    search: normalizeSearch(input.search),
    dateFrom: input.dateFrom || undefined,
    dateTo: input.dateTo || undefined
  };
}

function normalizeMessage(value) {
  const message = String(value || '').trim();
  if (!message) throw new ApiError(400, 'Message is required');
  return message.slice(0, 5000);
}

function mapCategoryLabel(category) {
  const labels = {
    order_issue: 'Order issue',
    payment_issue: 'Payment issue',
    auction_issue: 'Auction issue',
    account_issue: 'Account issue',
    seller_issue: 'Seller issue',
    other: 'Other'
  };
  return labels[category] || 'Other';
}

function mapThreadRow(row) {
  if (!row) return null;
  return {
    ...row,
    category_label: mapCategoryLabel(row.category),
    message_count: Number(row.message_count || 0)
  };
}

function mapMessageRow(row) {
  if (!row) return null;
  return {
    ...row,
    sender_display_name: row.sender_first_name
      ? `${row.sender_first_name}${row.sender_last_name ? ` ${row.sender_last_name}` : ''}`.trim()
      : row.sender_username || (row.sender_type === 'admin' ? 'Support team' : 'Member')
  };
}

async function buildThreadDetail(client, threadId, options = {}) {
  const thread = options.userId
    ? await supportRepository.getThreadByIdForUser(client, threadId, options.userId)
    : await supportRepository.getThreadById(client, threadId);

  if (!thread) {
    throw new ApiError(404, 'Support conversation not found');
  }

  const messages = await supportRepository.listMessagesByThreadId(client, threadId);
  return {
    thread: mapThreadRow(thread),
    messages: messages.map(mapMessageRow),
    categories: SUPPORT_CATEGORIES,
    statuses: SUPPORT_STATUSES
  };
}

async function listUserThreads(userId, filters = {}, paginationInput = {}) {
  const pagination = normalizePagination({ ...paginationInput, limit: paginationInput.limit || 20, maxLimit: 50 });
  const safeFilters = normalizeThreadFilters(filters);
  const result = await supportRepository.listThreads(null, safeFilters, pagination, { userId });
  const summary = await supportRepository.getThreadSummary(null, { userId });

  return {
    data: result.items.map(mapThreadRow),
    summary,
    pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
  };
}

async function getUserThread(userId, threadId) {
  return withTransaction((client) => buildThreadDetail(client, threadId, { userId }));
}

async function createUserThread(userId, payload) {
  const subject = String(payload.subject || '').trim() || 'Support request';
  const category = SUPPORT_CATEGORIES.includes(payload.category) ? payload.category : 'other';
  const message = normalizeMessage(payload.message);

  return withTransaction(async (client) => {
    const thread = await supportRepository.createThread(client, {
      userId,
      subject: subject.slice(0, 160),
      category,
      status: 'open'
    });

    await supportRepository.createMessage(client, {
      threadId: thread.id,
      senderType: 'user',
      senderUserId: userId,
      message
    });

    await supportRepository.touchThread(client, thread.id, 'open');
    return buildThreadDetail(client, thread.id, { userId });
  });
}

async function sendUserMessage(userId, threadId, payload) {
  const message = normalizeMessage(payload.message);

  return withTransaction(async (client) => {
    const thread = await supportRepository.getThreadByIdForUser(client, threadId, userId);
    if (!thread) throw new ApiError(404, 'Support conversation not found');

    await supportRepository.createMessage(client, {
      threadId,
      senderType: 'user',
      senderUserId: userId,
      message
    });

    await supportRepository.touchThread(client, threadId, 'open');
    return buildThreadDetail(client, threadId, { userId });
  });
}

async function listAdminThreads(filters = {}, paginationInput = {}) {
  const pagination = normalizePagination({ ...paginationInput, limit: paginationInput.limit || 100, maxLimit: 100 });
  const safeFilters = normalizeThreadFilters(filters);

  try {
    const result = await supportRepository.listThreads(null, safeFilters, pagination);
    const summary = await supportRepository.getThreadSummary();

    return {
      data: result.items.map(mapThreadRow),
      summary,
      pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: result.total })
    };
  } catch (error) {
    console.error('[admin.support.threads] failed', error);
    return {
      data: [],
      summary: {},
      pagination: buildPagination({ page: pagination.page, limit: pagination.limit, total: 0 })
    };
  }
}

async function getAdminThread(threadId) {
  return withTransaction((client) => buildThreadDetail(client, threadId));
}

async function sendAdminMessage(adminUserId, threadId, payload) {
  const message = normalizeMessage(payload.message);

  return withTransaction(async (client) => {
    const thread = await supportRepository.getThreadById(client, threadId);
    if (!thread) throw new ApiError(404, 'Support conversation not found');

    const supportMessage = await supportRepository.createMessage(client, {
      threadId,
      senderType: 'admin',
      senderUserId: adminUserId,
      message
    });

    await supportRepository.setThreadStatus(client, threadId, {
      status: 'replied',
      closedAt: null,
      closedBy: null
    });

    await notificationService.createNotificationOnce(client, notificationService.buildSupportReplyNotification({
      id: supportMessage.id,
      thread_id: threadId,
      user_id: thread.user_id,
      subject: thread.subject,
      message,
      created_at: supportMessage.created_at
    }));

    return buildThreadDetail(client, threadId);
  });
}

async function updateAdminThreadStatus(adminUserId, threadId, payload) {
  const status = SUPPORT_STATUSES.includes(payload.status) ? payload.status : null;
  if (!status) throw new ApiError(400, 'Invalid support status');

  return withTransaction(async (client) => {
    const thread = await supportRepository.getThreadById(client, threadId);
    if (!thread) throw new ApiError(404, 'Support conversation not found');

    await supportRepository.setThreadStatus(client, threadId, {
      status,
      closedAt: status === 'closed' ? new Date().toISOString() : null,
      closedBy: status === 'closed' ? adminUserId : null
    });

    return buildThreadDetail(client, threadId);
  });
}

module.exports = {
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  listUserThreads,
  getUserThread,
  createUserThread,
  sendUserMessage,
  listAdminThreads,
  getAdminThread,
  sendAdminMessage,
  updateAdminThreadStatus
};
