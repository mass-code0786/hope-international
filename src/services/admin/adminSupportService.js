const supportService = require('../supportService');

async function listSupportThreads(filters, pagination) {
  return supportService.listAdminThreads(filters, pagination);
}

async function getSupportThread(threadId) {
  return supportService.getAdminThread(threadId);
}

async function replyToSupportThread(adminUserId, threadId, payload) {
  return supportService.sendAdminMessage(adminUserId, threadId, payload);
}

async function updateSupportThreadStatus(adminUserId, threadId, payload) {
  return supportService.updateAdminThreadStatus(adminUserId, threadId, payload);
}

module.exports = {
  listSupportThreads,
  getSupportThread,
  replyToSupportThread,
  updateSupportThreadStatus
};
