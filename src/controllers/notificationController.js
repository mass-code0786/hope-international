const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const notificationService = require('../services/notificationService');

const listMyNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listUserNotifications(req.user.sub, {
    page: req.query.page,
    limit: req.query.limit
  });

  return success(res, {
    data: result.data,
    pagination: result.pagination,
    summary: result.summary,
    message: result.data.length ? 'Notifications fetched successfully' : 'No notifications yet'
  });
});

const unreadCount = asyncHandler(async (req, res) => {
  const data = await notificationService.getUnreadCount(req.user.sub);
  return success(res, {
    data,
    message: 'Unread notification count fetched successfully'
  });
});

const markMyNotificationAsRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markNotificationAsRead(req.user.sub, req.params.id);
  return success(res, {
    data,
    message: 'Notification marked as read'
  });
});

const markAllMyNotificationsAsRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markAllNotificationsAsRead(req.user.sub);
  return success(res, {
    data,
    message: 'All notifications marked as read'
  });
});

module.exports = {
  listMyNotifications,
  unreadCount,
  markMyNotificationAsRead,
  markAllMyNotificationsAsRead
};
