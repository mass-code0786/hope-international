const express = require('express');
const userController = require('../controllers/userController');
const notificationController = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  compensationWeeklyQuerySchema,
  compensationMonthlyQuerySchema,
  userAddressQuerySchema,
  userAddressCreateSchema,
  userAddressUpdateSchema,
  webauthnStatusSchema,
  webauthnCredentialParamSchema,
  welcomeSpinStatusSchema,
  welcomeSpinClaimSchema,
  notificationsListQuerySchema,
  notificationIdParamSchema,
  notificationReadAllSchema
} = require('../utils/schemas');

const router = express.Router();

router.get('/me', auth(), userController.me);
router.get('/me/children', auth(), userController.myChildren);
router.get('/me/team/summary', auth(), userController.myTeamSummary);
router.get('/me/team/tree', auth(), userController.myTeamTreeRoot);
router.get('/me/team/tree/:memberId', auth(), userController.myTeamTreeNode);
router.get('/me/compensation/weekly', auth(), validate(compensationWeeklyQuerySchema), userController.weeklyCompensation);
router.get('/me/compensation/monthly', auth(), validate(compensationMonthlyQuerySchema), userController.monthlyCompensation);
router.get('/me/address', auth(), validate(userAddressQuerySchema), userController.getAddress);
router.post('/me/address', auth(), validate(userAddressCreateSchema), userController.createAddress);
router.patch('/me/address', auth(), validate(userAddressUpdateSchema), userController.updateAddress);
router.get('/me/webauthn', auth(), validate(webauthnStatusSchema), userController.webauthnStatus);
router.delete('/me/webauthn/:credentialId', auth(), validate(webauthnCredentialParamSchema), userController.removeWebauthnCredential);
router.get('/me/welcome-spin/status', auth(), validate(welcomeSpinStatusSchema), userController.welcomeSpinStatus);
router.post('/me/welcome-spin/claim', auth(), validate(welcomeSpinClaimSchema), userController.claimWelcomeSpin);
router.get('/me/notifications', auth(), validate(notificationsListQuerySchema), notificationController.listMyNotifications);
router.get('/me/notifications/unread-count', auth(), notificationController.unreadCount);
router.patch('/me/notifications/read-all', auth(), validate(notificationReadAllSchema), notificationController.markAllMyNotificationsAsRead);
router.patch('/me/notifications/:id/read', auth(), validate(notificationIdParamSchema), notificationController.markMyNotificationAsRead);

module.exports = router;
